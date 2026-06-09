'use strict';

const client = require('./client');

const DEFAULT_SITE_ID = 'MLB';
const CANDIDATE_LIMIT = 8;
const HIGHLIGHTS_MINIMUM = 10;

const normalizeText = (value = '') => {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const safeGet = async (path, params = {}, options = {}) => {
  try {
    return {
      ok: true,
      data: await client.get(path, params, options),
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        path,
        status: error.status || null,
        message: error.message,
        data: error.data || null,
      },
    };
  }
};

const getCategoryPath = (category) => {
  const path = Array.isArray(category?.path_from_root) ? category.path_from_root : [];

  return path.map((item) => ({
    id: item.id,
    name: item.name,
  }));
};

const getRootCategory = (path = []) => {
  const root = path[0];

  return root
    ? {
        id: root.id,
        name: root.name,
      }
    : null;
};

const getHighlightsItems = (payload) => {
  const candidates = [
    payload?.content,
    payload?.results,
    payload?.items,
    payload?.data?.content,
    payload?.data?.results,
  ];

  return candidates.find((value) => Array.isArray(value)) || [];
};

const makeCandidateKey = (candidate) => {
  return candidate.id || candidate.name;
};

const mergeCandidate = (candidateMap, candidate) => {
  const key = makeCandidateKey(candidate);

  if (!key || candidateMap.has(key)) {
    return;
  }

  candidateMap.set(key, candidate);
};

const confidenceFromRank = (index) => {
  return Number(Math.max(0.35, 0.95 - index * 0.08).toFixed(2));
};

const candidatesFromDomainDiscovery = (payload) => {
  const items = Array.isArray(payload) ? payload : [];

  return items.map((item, index) => ({
    id: item.category_id || null,
    name: item.category_name || null,
    domainId: item.domain_id || null,
    domainName: item.domain_name || null,
    source: 'domain_discovery',
    confidence: confidenceFromRank(index),
    confidenceSource: 'ranked-order',
  }));
};

const extractSearchCategoryFilterValues = (payload) => {
  const filters = [...(payload?.filters || []), ...(payload?.available_filters || [])];
  const categoryFilter = filters.find((filter) => filter.id === 'category');

  return Array.isArray(categoryFilter?.values) ? categoryFilter.values : [];
};

const candidatesFromSearch = (payload) => {
  const values = extractSearchCategoryFilterValues(payload);

  return values.map((value, index) => ({
    id: value.id || null,
    name: value.name || null,
    domainId: null,
    domainName: null,
    source: 'site_search_filter',
    confidence: value.results ? null : confidenceFromRank(index),
    confidenceSource: value.results ? 'results-count' : 'ranked-order',
    resultCount: value.results ?? null,
  }));
};

const discoverCandidates = async ({ siteId, term }) => {
  const errors = [];
  const candidateMap = new Map();
  const domainDiscovery = await safeGet(
    `/sites/${siteId}/domain_discovery/search`,
    {
      q: term,
      limit: CANDIDATE_LIMIT,
    },
    { auth: false }
  );

  if (domainDiscovery.ok) {
    for (const candidate of candidatesFromDomainDiscovery(domainDiscovery.data)) {
      mergeCandidate(candidateMap, candidate);
    }
  } else {
    errors.push({
      source: 'domain_discovery',
      ...domainDiscovery.error,
    });
  }

  const search = await safeGet(
    `/sites/${siteId}/search`,
    {
      q: term,
      limit: 1,
    },
    { auth: false }
  );

  if (search.ok) {
    for (const candidate of candidatesFromSearch(search.data)) {
      mergeCandidate(candidateMap, candidate);
    }
  } else {
    errors.push({
      source: 'site_search_filter',
      ...search.error,
    });
  }

  return {
    candidates: Array.from(candidateMap.values()).slice(0, CANDIDATE_LIMIT),
    errors,
  };
};

const enrichCategory = async (candidate) => {
  if (!candidate.id) {
    return {
      ...candidate,
      path: [],
      rootCategory: null,
      categoryStatus: null,
      totalItems: null,
      categoryError: 'missing categoryId',
    };
  }

  const response = await safeGet(`/categories/${candidate.id}`, {}, { auth: false });

  if (!response.ok) {
    return {
      ...candidate,
      path: [],
      rootCategory: null,
      categoryStatus: null,
      totalItems: null,
      categoryError: response.error,
    };
  }

  const path = getCategoryPath(response.data);

  return {
    ...candidate,
    name: candidate.name || response.data?.name || null,
    path,
    rootCategory: getRootCategory(path),
    categoryStatus: response.data?.settings?.status || null,
    totalItems: response.data?.total_items_in_this_category ?? null,
  };
};

const validateHighlightsForCandidate = async (candidate, siteId, validateHighlights) => {
  if (!validateHighlights) {
    return {
      ...candidate,
      hasHighlights: null,
      highlightsCount: null,
      highlightIds: [],
      highlightTypes: [],
      highlightsError: null,
    };
  }

  if (!candidate.id) {
    return {
      ...candidate,
      hasHighlights: false,
      highlightsCount: 0,
      highlightIds: [],
      highlightTypes: [],
      highlightsError: 'missing categoryId',
    };
  }

  const response = await safeGet(`/highlights/${siteId}/category/${candidate.id}`);

  if (!response.ok) {
    return {
      ...candidate,
      hasHighlights: false,
      highlightsCount: 0,
      highlightIds: [],
      highlightTypes: [],
      highlightsError: response.error,
    };
  }

  const items = getHighlightsItems(response.data);

  return {
    ...candidate,
    hasHighlights: items.length >= HIGHLIGHTS_MINIMUM,
    highlightsCount: items.length,
    highlightIds: items.slice(0, 10).map((item) => item.id || item.item_id || item.product_id || null),
    highlightTypes: [...new Set(items.map((item) => item.type || null).filter(Boolean))],
  };
};

const validateCandidates = async (candidates, siteId, validateHighlights) => {
  const validated = [];

  for (const candidate of candidates) {
    const enriched = await enrichCategory(candidate);
    const withHighlights = await validateHighlightsForCandidate(
      enriched,
      siteId,
      validateHighlights
    );

    validated.push(withHighlights);
  }

  return validated;
};

const scoreCandidate = (candidate, term) => {
  const normalizedTerm = normalizeText(term);
  const normalizedName = normalizeText(
    [candidate.domainName, candidate.name, candidate.path?.map((item) => item.name).join(' ')]
      .filter(Boolean)
      .join(' ')
  );
  const semanticBoost = normalizedName.includes(normalizedTerm) ? 0.08 : 0;
  const highlightsBoost = candidate.highlightsCount >= HIGHLIGHTS_MINIMUM ? 0.2 : 0;
  const base = typeof candidate.confidence === 'number' ? candidate.confidence : 0.5;

  return Number(Math.min(1, base + semanticBoost + highlightsBoost).toFixed(2));
};

const chooseBestCandidate = (candidates, term, validateHighlights) => {
  const candidatesWithScores = candidates.map((candidate) => ({
    ...candidate,
    finalScore: scoreCandidate(candidate, term),
  }));

  if (validateHighlights) {
    const firstResolved = candidatesWithScores.find(
      (candidate) => candidate.highlightsCount >= HIGHLIGHTS_MINIMUM
    );

    if (firstResolved) {
      return firstResolved;
    }
  }

  return [...candidatesWithScores].sort(
    (first, second) => second.finalScore - first.finalScore
  )[0] || null;
};

const normalizeCandidate = (candidate) => ({
  id: candidate.id,
  name: candidate.name,
  path: candidate.path || [],
  rootCategory: candidate.rootCategory || null,
  source: candidate.source,
  confidence: candidate.confidence ?? null,
  confidenceSource: candidate.confidenceSource || null,
  finalScore: candidate.finalScore ?? null,
  domainId: candidate.domainId || null,
  domainName: candidate.domainName || null,
  totalItems: candidate.totalItems ?? null,
  hasHighlights: candidate.hasHighlights,
  highlightsCount: candidate.highlightsCount,
  highlightTypes: candidate.highlightTypes || [],
  categoryError: candidate.categoryError || null,
  highlightsError: candidate.highlightsError || null,
});

const resolveMarketplaceCategory = async ({
  siteId = DEFAULT_SITE_ID,
  term,
  validateHighlights = true,
} = {}) => {
  const normalizedTerm = typeof term === 'string' ? term.trim() : '';

  if (!normalizedTerm) {
    throw new Error('term is required');
  }

  const discovery = await discoverCandidates({
    siteId,
    term: normalizedTerm,
  });
  const validatedCandidates = await validateCandidates(
    discovery.candidates,
    siteId,
    validateHighlights
  );
  const candidatesWithScores = validatedCandidates.map((candidate) => ({
    ...candidate,
    finalScore: scoreCandidate(candidate, normalizedTerm),
  }));
  const best = chooseBestCandidate(validatedCandidates, normalizedTerm, validateHighlights);

  return {
    success: true,
    term: normalizedTerm,
    siteId,
    resolved: Boolean(
      best?.id && (!validateHighlights || best.highlightsCount >= HIGHLIGHTS_MINIMUM)
    ),
    bestCategory: best ? normalizeCandidate(best) : null,
    alternatives: candidatesWithScores
      .filter((candidate) => candidate.id !== best?.id)
      .map(normalizeCandidate),
    errors: discovery.errors,
  };
};

module.exports = {
  resolveMarketplaceCategory,
};
