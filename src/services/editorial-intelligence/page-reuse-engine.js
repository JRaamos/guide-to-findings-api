'use strict';

const uid = {
  page: 'api::page.page',
};

const MARKETPLACE_PATTERN = /\bmercado\s+livre\b|\bmercadolivre\b|\bmlb\b/gi;
const YEAR_PATTERN = /\b20\d{2}\b/g;
const DATE_PATTERN = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g;
const BEST_INTENT_WORDS = /\b(?:melhor|melhores|top|ranking|guia|comprar|compra|qual|quais|mais|vendido|vendidos|vendida|vendidas|escolha|sua|seu|os|as|o|a|de|do|da|dos|das|em|no|na|nos|nas|para)\b/g;
const COST_BENEFIT_PATTERN = /\bcusto\s*-?\s*beneficio\b|\bcusto\s*-?\s*benefício\b/i;
const COMPARISON_PATTERN = /\bcomparativo\b|\bcomparacao\b|\bcomparação\b|\bversus\b|\bvs\b/i;
const REUSABLE_STATUSES = ['published', 'draft', 'review'];

const normalizeWhitespace = (value = '') => {
  if (value === null || value === undefined) {
    return '';
  }

  return value.toString().replace(/\s+/g, ' ').trim();
};

const removeAccents = (value = '') => {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const normalizeSlug = (value = '') => {
  return removeAccents(value)
    .toLowerCase()
    .replace(YEAR_PATTERN, '')
    .replace(DATE_PATTERN, '')
    .replace(MARKETPLACE_PATTERN, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
};

const singularizeLastWord = (term) => {
  if (term.endsWith('air fryers')) {
    return term.replace(/air fryers$/, 'air fryer');
  }

  const words = term.split(' ').filter(Boolean);
  const lastWord = words[words.length - 1];

  if (!lastWord) {
    return term;
  }

  if (lastWord.endsWith('s') && lastWord.length > 3) {
    words[words.length - 1] = lastWord.slice(0, -1);
  }

  return words.join(' ');
};

const pluralizeLastWord = (term) => {
  if (term.endsWith('air fryer')) {
    return term.replace(/air fryer$/, 'air fryers');
  }

  const words = term.split(' ').filter(Boolean);
  const lastWord = words[words.length - 1];

  if (!lastWord || lastWord.endsWith('s')) {
    return term;
  }

  if (lastWord.endsWith('m')) {
    words[words.length - 1] = `${lastWord.slice(0, -1)}ns`;
  } else if (lastWord.endsWith('r') || lastWord.endsWith('z')) {
    words[words.length - 1] = `${lastWord}es`;
  } else {
    words[words.length - 1] = `${lastWord}s`;
  }

  return words.join(' ');
};

const inferIntentFromTerm = (term) => {
  if (COST_BENEFIT_PATTERN.test(term)) {
    return 'costBenefit';
  }

  if (COMPARISON_PATTERN.test(term)) {
    return 'comparison';
  }

  return 'best';
};

const normalizeEditorialTerm = (value = '') => {
  const normalized = removeAccents(value)
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(YEAR_PATTERN, '')
    .replace(DATE_PATTERN, '')
    .replace(MARKETPLACE_PATTERN, '')
    .replace(COST_BENEFIT_PATTERN, '')
    .replace(COMPARISON_PATTERN, '')
    .replace(BEST_INTENT_WORDS, '')
    .replace(/\b\d+\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = normalized
    .split(' ')
    .map((token) => singularizeLastWord(token))
    .filter(Boolean);

  return [...new Set(tokens)].join(' ');
};

const getActionForStatus = (status) => {
  if (status === 'published') {
    return 'reuse-published';
  }

  if (status === 'review') {
    return 'reuse-review';
  }

  return 'reuse-draft';
};

const buildResultFromPage = ({ page, reason }) => ({
  found: true,
  pageId: page.id,
  pageStatus: page.status,
  reason,
  action: getActionForStatus(page.status),
});

const buildCreateNewResult = (reason = 'No reusable editorial Page found') => ({
  found: false,
  pageId: null,
  pageStatus: null,
  reason,
  action: 'create-new',
});

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const getPagePopulate = () => ({
  category: true,
  seo: true,
  faqs: true,
  ranking: true,
});

const findPageBySlug = (strapi, slug) => {
  if (!slug) {
    return null;
  }

  return query(strapi, uid.page).findOne({
    where: {
      slug,
      status: {
        $in: REUSABLE_STATUSES,
      },
    },
    populate: getPagePopulate(),
  });
};

const findPageByEquivalentTerm = async (strapi, { termKey, intent, preferredSlug }) => {
  if (!termKey || intent !== 'best') {
    return null;
  }

  const pluralTerm = pluralizeLastWord(termKey);
  const candidateSlugs = [
    preferredSlug,
    normalizeSlug(`melhores ${pluralTerm}`),
    normalizeSlug(`top ${pluralTerm}`),
    normalizeSlug(`${pluralTerm}`),
  ].filter(Boolean);

  for (const slug of [...new Set(candidateSlugs)]) {
    const page = await findPageBySlug(strapi, slug);

    if (page) {
      return page;
    }
  }

  const pages = await query(strapi, uid.page).findMany({
    where: {
      pageType: 'ranking',
      status: {
        $in: REUSABLE_STATUSES,
      },
    },
    populate: getPagePopulate(),
    limit: 200,
  });

  return pages.find((page) => {
    const pageTermKey = normalizeEditorialTerm(`${page.slug} ${page.title}`);

    return pageTermKey === termKey;
  }) || null;
};

const resolveArgs = (strapiOrOptions, maybeOptions) => {
  if (strapiOrOptions?.db) {
    return {
      strapi: strapiOrOptions,
      options: maybeOptions || {},
    };
  }

  return {
    strapi: global.strapi,
    options: strapiOrOptions || {},
  };
};

const findReusablePage = async (strapiOrOptions = {}, maybeOptions) => {
  const { strapi, options } = resolveArgs(strapiOrOptions, maybeOptions);

  if (!strapi?.db) {
    throw new Error('strapi instance is required');
  }

  const { term, commandContext, editorialPlan, ranking } = options;
  const rankingPage = ranking?.page || null;

  if (rankingPage?.id && REUSABLE_STATUSES.includes(rankingPage.status)) {
    return buildResultFromPage({
      page: rankingPage,
      reason: 'Ranking already has a reusable Page',
    });
  }

  const slugHint = normalizeSlug(editorialPlan?.slugHint);
  const exactSlugPage = await findPageBySlug(strapi, slugHint);

  if (exactSlugPage) {
    return buildResultFromPage({
      page: exactSlugPage,
      reason: 'Found Page with exact editorial slug',
    });
  }

  const contextTerm = commandContext?.normalizedTerm || commandContext?.term || term;
  const inputIntent = editorialPlan?.intent || commandContext?.editorialIntent || inferIntentFromTerm(contextTerm);
  const termKey = normalizeEditorialTerm(
    contextTerm || editorialPlan?.normalizedTerm || editorialPlan?.term
  );
  const equivalentPage = await findPageByEquivalentTerm(strapi, {
    termKey,
    intent: inputIntent,
    preferredSlug: slugHint,
  });

  if (equivalentPage) {
    return buildResultFromPage({
      page: equivalentPage,
      reason: 'Found Page with equivalent normalized editorial term',
    });
  }

  return buildCreateNewResult();
};

module.exports = {
  findReusablePage,
  normalizeEditorialTerm,
};
