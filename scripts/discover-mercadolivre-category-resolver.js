'use strict';

require('dotenv').config();

const client = require('../src/services/marketplaces/mercado-livre/client');

const DEFAULT_SITE_ID = 'MLB';
const DEFAULT_TERM = 'furadeira';
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

const getTerm = () => {
  const term = process.argv.slice(2).join(' ').trim();

  return term || DEFAULT_TERM;
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
  return candidate.categoryId || candidate.categoryName;
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
    categoryId: item.category_id || null,
    categoryName: item.category_name || null,
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
    categoryId: value.id || null,
    categoryName: value.name || null,
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
  if (!candidate.categoryId) {
    return {
      ...candidate,
      path: [],
      rootCategory: null,
      categoryStatus: null,
      totalItems: null,
      categoryError: 'missing categoryId',
    };
  }

  const response = await safeGet(`/categories/${candidate.categoryId}`, {}, { auth: false });

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
    categoryName: candidate.categoryName || response.data?.name || null,
    path,
    rootCategory: getRootCategory(path),
    categoryStatus: response.data?.settings?.status || null,
    totalItems: response.data?.total_items_in_this_category ?? null,
  };
};

const validateHighlights = async (candidate, siteId) => {
  if (!candidate.categoryId) {
    return {
      ...candidate,
      hasHighlights: false,
      highlightsCount: 0,
      highlightIds: [],
      highlightsError: 'missing categoryId',
    };
  }

  const response = await safeGet(`/highlights/${siteId}/category/${candidate.categoryId}`);

  if (!response.ok) {
    return {
      ...candidate,
      hasHighlights: false,
      highlightsCount: 0,
      highlightIds: [],
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

const validateCandidates = async (candidates, siteId) => {
  const validated = [];

  for (const candidate of candidates) {
    const enriched = await enrichCategory(candidate);
    const withHighlights = await validateHighlights(enriched, siteId);

    validated.push(withHighlights);
  }

  return validated;
};

const scoreCandidate = (candidate, term) => {
  const normalizedTerm = normalizeText(term);
  const normalizedName = normalizeText(
    [candidate.domainName, candidate.categoryName, candidate.path?.map((item) => item.name).join(' ')]
      .filter(Boolean)
      .join(' ')
  );
  const semanticBoost = normalizedName.includes(normalizedTerm) ? 0.08 : 0;
  const highlightsBoost = candidate.highlightsCount >= HIGHLIGHTS_MINIMUM ? 0.2 : 0;
  const base = typeof candidate.confidence === 'number' ? candidate.confidence : 0.5;

  return Number(Math.min(1, base + semanticBoost + highlightsBoost).toFixed(2));
};

const chooseBestCandidate = (candidates, term) => {
  const candidatesWithScores = candidates.map((candidate) => ({
    ...candidate,
    finalScore: scoreCandidate(candidate, term),
  }));
  const firstResolved = candidatesWithScores.find(
    (candidate) => candidate.highlightsCount >= HIGHLIGHTS_MINIMUM
  );

  if (firstResolved) {
    return firstResolved;
  }

  return [...candidatesWithScores].sort(
    (first, second) => second.finalScore - first.finalScore
  )[0] || null;
};

const summarizeCandidate = (candidate) => ({
  categoryId: candidate.categoryId,
  categoryName: candidate.categoryName,
  domainId: candidate.domainId,
  domainName: candidate.domainName,
  source: candidate.source,
  confidence: candidate.confidence,
  confidenceSource: candidate.confidenceSource,
  finalScore: candidate.finalScore ?? null,
  rootCategory: candidate.rootCategory,
  path: candidate.path || [],
  totalItems: candidate.totalItems,
  hasHighlights: Boolean(candidate.hasHighlights),
  highlightsCount: candidate.highlightsCount || 0,
  highlightTypes: candidate.highlightTypes || [],
  categoryError: candidate.categoryError || null,
  highlightsError: candidate.highlightsError || null,
});

const main = async () => {
  const term = getTerm();
  const siteId = client.getConfig().siteId || DEFAULT_SITE_ID;
  const discovery = await discoverCandidates({ siteId, term });
  const validatedCandidates = await validateCandidates(discovery.candidates, siteId);
  const best = chooseBestCandidate(validatedCandidates, term);
  const candidatesWithScores = validatedCandidates.map((candidate) => ({
    ...candidate,
    finalScore: scoreCandidate(candidate, term),
  }));

  console.log(
    JSON.stringify(
      {
        term,
        siteId,
        resolved: Boolean(best?.categoryId && best.highlightsCount >= HIGHLIGHTS_MINIMUM),
        bestCategoryId: best?.categoryId || null,
        bestCategoryName: best?.categoryName || null,
        source: best?.source || null,
        hasHighlights: Boolean(best?.hasHighlights),
        highlightsCount: best?.highlightsCount || 0,
        confidence: best?.confidence ?? null,
        confidenceSource: best?.confidenceSource || null,
        finalScore: best?.finalScore ?? null,
        rootCategory: best?.rootCategory || null,
        path: best?.path || [],
        alternativeCategories: candidatesWithScores
          .filter((candidate) => candidate.categoryId !== best?.categoryId)
          .map(summarizeCandidate),
        bestCandidate: best ? summarizeCandidate(best) : null,
        errors: discovery.errors,
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: error.message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
