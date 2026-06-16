'use strict';

const {
  buildEditorialTermKey,
  normalizeIntent,
  normalizeKeyText,
} = require('../editorial-intelligence/editorial-key');

const uid = {
  page: 'api::page.page',
};

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 8;
const CANDIDATE_LIMIT = 500;

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const getStrapi = (strapiInstance) => {
  const activeStrapi = strapiInstance || global.strapi;

  if (!activeStrapi?.db?.query) {
    throw new Error('A Strapi instance is required to calculate internal links');
  }

  return activeStrapi;
};

const parsePositiveInteger = (value, fallback) => {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : fallback;
};

const normalizeLimit = (limit) => Math.min(parsePositiveInteger(limit, DEFAULT_LIMIT), MAX_LIMIT);

const getPageEditorialKey = (page) => {
  return page?.editorialKey || page?.ranking?.editorialKey || null;
};

const getPageEditorialIntent = (page) => {
  return normalizeIntent(page?.editorialIntent || page?.ranking?.editorialIntent || null);
};

const getBaseTermFromEditorialKey = (editorialKey) => {
  if (!editorialKey) {
    return null;
  }

  return editorialKey.split(':').filter(Boolean)[0] || null;
};

const buildFallbackBaseTerm = (page) => {
  return buildEditorialTermKey({
    term: [page?.slug, page?.title].filter(Boolean).join(' '),
    intent: getPageEditorialIntent(page),
  });
};

const getBaseTerm = (page) => {
  return getBaseTermFromEditorialKey(getPageEditorialKey(page)) || buildFallbackBaseTerm(page);
};

const hasCategoryMatch = (page, candidate) => {
  return Boolean(page?.category?.id && candidate?.category?.id && page.category.id === candidate.category.id);
};

const hasSubCategoryMatch = (page, candidate) => {
  return Boolean(
    page?.subCategory?.id &&
    candidate?.subCategory?.id &&
    page.subCategory.id === candidate.subCategory.id
  );
};

const calculateScore = (page, candidate) => {
  let relationshipScore = 0;
  const pageBaseTerm = getBaseTerm(page);
  const candidateBaseTerm = getBaseTerm(candidate);
  const pageIntent = getPageEditorialIntent(page);
  const candidateIntent = getPageEditorialIntent(candidate);

  if (pageBaseTerm && candidateBaseTerm && pageBaseTerm === candidateBaseTerm) {
    relationshipScore += 100;
  }

  if (hasCategoryMatch(page, candidate)) {
    relationshipScore += 35;
  }

  if (hasSubCategoryMatch(page, candidate)) {
    relationshipScore += 15;
  }

  if (!relationshipScore) {
    return 0;
  }

  let score = relationshipScore;

  if (pageIntent && candidateIntent && pageIntent === candidateIntent) {
    score += 8;
  }

  if (page?.pageType === candidate?.pageType) {
    score += 5;
  }

  if (getPageEditorialKey(candidate)) {
    score += 2;
  }

  return score;
};

const serializeRelatedPage = (page, score) => {
  const categorySlug = page.category?.slug || null;

  return {
    pageId: page.id,
    id: page.id,
    title: page.title,
    slug: page.slug,
    categorySlug,
    url: categorySlug ? `/${categorySlug}/${page.slug}` : null,
    editorialIntent: getPageEditorialIntent(page),
    score,
  };
};

const getPage = (strapi, pageId) => {
  return query(strapi, uid.page).findOne({
    where: {
      id: pageId,
      status: 'published',
    },
    populate: {
      category: true,
      subCategory: true,
      ranking: true,
    },
  });
};

const getCandidatePages = (strapi, pageId) => {
  return query(strapi, uid.page).findMany({
    where: {
      id: {
        $ne: pageId,
      },
      status: 'published',
      pageType: 'ranking',
    },
    populate: {
      category: true,
      subCategory: true,
      ranking: true,
    },
    limit: CANDIDATE_LIMIT,
  });
};

const resolveArgs = (strapiOrOptions = {}, maybeOptions) => {
  if (strapiOrOptions?.db) {
    return {
      strapi: getStrapi(strapiOrOptions),
      options: maybeOptions || {},
    };
  }

  return {
    strapi: getStrapi(),
    options: strapiOrOptions || {},
  };
};

const getRelatedPages = async (strapiOrOptions = {}, maybeOptions) => {
  const { strapi, options } = resolveArgs(strapiOrOptions, maybeOptions);
  const pageId = parsePositiveInteger(options.pageId, null);

  if (!pageId) {
    return [];
  }

  const page = await getPage(strapi, pageId);

  if (!page || page.pageType !== 'ranking') {
    return [];
  }

  const limit = normalizeLimit(options.limit);
  const candidates = await getCandidatePages(strapi, page.id);

  return candidates
    .map((candidate) => ({
      candidate,
      score: calculateScore(page, candidate),
      normalizedTitle: normalizeKeyText(candidate.title),
    }))
    .filter((item) => item.score > 0)
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return first.normalizedTitle.localeCompare(second.normalizedTitle, 'pt-BR');
    })
    .slice(0, limit)
    .map(({ candidate, score }) => serializeRelatedPage(candidate, score));
};

module.exports = {
  getRelatedPages,
};
