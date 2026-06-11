'use strict';

const { buildCommandContext } = require('../../editorial-intelligence/command-context');
const { buildEditorialPlan } = require('../../editorial-intelligence/editorial-plan');
const { findReusablePage } = require('../../editorial-intelligence/page-reuse-engine');
const { resolveMarketplaceCategory } = require('./category-resolver');

const DEFAULT_SITE_ID = 'MLB';

const uid = {
  category: 'api::category.category',
  subCategory: 'api::sub-category.sub-category',
};

const GENERIC_SUBCATEGORY_NAMES = new Set([
  'de ar',
  'de mao',
  'de mão',
  'de bancada',
  'outros',
  'outras',
]);
const TERM_STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'com', 'e']);

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const normalizeWhitespace = (value = '') => {
  if (value === null || value === undefined) {
    return '';
  }

  return value.toString().replace(/\s+/g, ' ').trim();
};

const normalizeText = (value = '') => {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const slugify = (value = '') => {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
};

const tokenize = (value = '') => {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !TERM_STOPWORDS.has(token));
};

const pluralizeToken = (token) => {
  if (!token || token.endsWith('s')) {
    return token;
  }

  return `${token}s`;
};

const hasTermMatch = (name, term) => {
  const normalizedName = normalizeText(name);
  const tokens = tokenize(term);

  return tokens.some((token) => {
    return normalizedName.includes(token) || normalizedName.includes(pluralizeToken(token));
  });
};

const isGenericSubCategoryName = (name) => {
  return GENERIC_SUBCATEGORY_NAMES.has(normalizeText(name));
};

const getPath = (resolvedCategory = {}) => {
  return Array.isArray(resolvedCategory.path) ? resolvedCategory.path.filter((item) => item?.name) : [];
};

const chooseLocalCategoryName = (path) => {
  return path[0]?.name || null;
};

const chooseLocalSubCategoryName = ({ path, term, resolvedCategory }) => {
  const searchablePath = path.slice(1);
  const termMatched = [...searchablePath]
    .reverse()
    .find((item) => hasTermMatch(item.name, term));

  if (termMatched?.name) {
    return termMatched.name;
  }

  const leafName = resolvedCategory.name || path[path.length - 1]?.name || null;

  if (leafName && !isGenericSubCategoryName(leafName)) {
    return leafName;
  }

  if (path.length >= 2) {
    return path[path.length - 2].name;
  }

  return leafName;
};

const serializeMarketplaceCategory = (category) => {
  if (!category) {
    return null;
  }

  return {
    id: category.id,
    name: category.name,
    path: category.path || [],
    rootCategory: category.rootCategory || null,
    source: category.source || null,
    confidence: category.confidence ?? null,
    finalScore: category.finalScore ?? null,
    hasHighlights: Boolean(category.hasHighlights),
    highlightsCount: category.highlightsCount || 0,
    highlightTypes: category.highlightTypes || [],
  };
};

const findExistingCategory = async (strapi, name) => {
  const slug = slugify(name);

  if (!slug) {
    return {
      id: null,
      name: name || null,
      slug: null,
      exists: false,
    };
  }

  const existing = await query(strapi, uid.category).findOne({
    where: {
      slug,
    },
  });

  return {
    id: existing?.id || null,
    name: existing?.name || name,
    slug,
    exists: Boolean(existing?.id),
    status: existing?.status || null,
  };
};

const findExistingSubCategory = async (strapi, name) => {
  const slug = slugify(name);

  if (!slug) {
    return {
      id: null,
      name: name || null,
      slug: null,
      exists: false,
    };
  }

  const existing = await query(strapi, uid.subCategory).findOne({
    where: {
      slug,
    },
    populate: ['category'],
  });

  return {
    id: existing?.id || null,
    name: existing?.name || name,
    slug,
    exists: Boolean(existing?.id),
    status: existing?.status || null,
    categoryId: existing?.category?.id || null,
  };
};

const previewLocalCategories = async (strapi, { term, resolvedCategory }) => {
  const path = getPath(resolvedCategory);
  const categoryName = chooseLocalCategoryName(path);
  const subCategoryName = chooseLocalSubCategoryName({
    path,
    term,
    resolvedCategory,
  });

  return {
    category: await findExistingCategory(strapi, categoryName),
    subCategory: await findExistingSubCategory(strapi, subCategoryName),
    rule: 'preview only: category=path[0], subCategory=deepest term-matched path segment or non-generic leaf',
  };
};

const buildRankingChatPreview = async (
  strapi,
  {
    message,
    term,
    siteId = DEFAULT_SITE_ID,
    limit,
    fetchLimit,
    displayLimit,
    editorialTemplate,
    editorialIntent,
    intentModifier,
    preferredSlug,
    titleHint,
  } = {}
) => {
  if (!strapi?.db) {
    throw new Error('strapi instance is required');
  }

  const commandContext = buildCommandContext({
    message,
    term,
    limit,
    fetchLimit,
    displayLimit,
    editorialTemplate,
    editorialIntent,
    intentModifier,
    preferredSlug,
    titleHint,
  });

  if (!commandContext.term) {
    throw new Error('term is required');
  }

  const editorialPlan = buildEditorialPlan({
    commandContext,
    sourceMarketplace: 'mercadoLivre',
  });
  const categoryResult = await resolveMarketplaceCategory({
    siteId,
    term: commandContext.term,
    validateHighlights: true,
  });
  const localCategory = categoryResult.bestCategory
    ? await previewLocalCategories(strapi, {
        term: commandContext.term,
        resolvedCategory: categoryResult.bestCategory,
      })
    : {
        category: null,
        subCategory: null,
        rule: null,
      };
  const pageReuse = await findReusablePage(strapi, {
    term: commandContext.term,
    commandContext,
    editorialPlan,
    ranking: null,
  });

  return {
    success: true,
    siteId,
    commandContext,
    editorialPlan,
    category: {
      resolved: Boolean(categoryResult.resolved),
      marketplace: serializeMarketplaceCategory(categoryResult.bestCategory),
      local: localCategory,
      alternatives: (categoryResult.alternatives || []).map(serializeMarketplaceCategory),
      warnings: (categoryResult.errors || []).map((error) => ({
        source: error.source || null,
        status: error.status || null,
        message: error.message,
      })),
    },
    pageReuse,
    preview: {
      persisted: false,
      marketplaceSynced: false,
      aiGenerated: false,
      publicationAttempted: false,
    },
  };
};

module.exports = {
  buildRankingChatPreview,
};
