'use strict';

const { syncMarketplaceRankingByTerm } = require('./ranking-term-sync');
const { generatePageFromRanking } = require('../../ai-generator');
const publicationWorkflow = require('../../publication-workflow');

const DEFAULT_SITE_ID = 'MLB';
const DEFAULT_LIMIT = 20;
const MINIMUM_RANKING_ITEMS = 10;
const MINIMUM_FAQS = 3;
const APPROVAL_PENDING_KEYS = new Set([
  'page.approved',
  'seo.approved',
  'seo.approvedAt',
  'faqs.approved',
]);
const FORBIDDEN_TITLE_TERMS = ['series', 'séries'];
const PLACEHOLDER_PATTERNS = [
  /\bplaceholder\b/i,
  /\blorem\s+ipsum\b/i,
  /\btbd\b/i,
  /\bTODO\b/i,
  /\[.+?\]/,
  /\{\{.+?\}\}/,
];
const GENERIC_TEXT_PATTERNS = [
  /escolher\s+.+pode\s+ser\s+uma\s+tarefa\s+dificil/i,
  /neste\s+artigo/i,
  /se\s+voce\s+esta\s+em\s+busca/i,
  /se\s+você\s+est[aá]\s+em\s+busca/i,
];
const YEAR_PATTERN = /\b20\d{2}\b/g;
const DATE_PATTERN = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g;
const MONTH_PATTERN = /\b(?:janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi;

const uid = {
  ranking: 'api::ranking.ranking',
  page: 'api::page.page',
};

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const normalizeText = (value = '') => {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const tokenize = (value = '') => {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
};

const getRanking = (strapi, rankingId) => {
  return query(strapi, uid.ranking).findOne({
    where: {
      id: rankingId,
    },
    populate: {
      page: true,
      items: {
        populate: {
          product: true,
          affiliateLink: true,
        },
        orderBy: {
          position: 'asc',
        },
      },
    },
  });
};

const getPage = (strapi, pageId) => {
  return query(strapi, uid.page).findOne({
    where: {
      id: pageId,
    },
    populate: {
      category: true,
      seo: true,
      faqs: true,
      ranking: true,
    },
  });
};

const addValidationError = (errors, code, message, details = {}) => {
  errors.push({
    code,
    message,
    ...details,
  });
};

const validateRankingBeforeGeneration = async (strapi, rankingId, resolvedCategory) => {
  const validationErrors = [];
  const ranking = await getRanking(strapi, rankingId);

  if (!ranking) {
    addValidationError(validationErrors, 'ranking.notFound', 'Ranking not found', { rankingId });

    return {
      ranking,
      validationErrors,
    };
  }

  if ((resolvedCategory?.highlightsCount || 0) < MINIMUM_RANKING_ITEMS) {
    addValidationError(
      validationErrors,
      'category.highlights',
      'Resolved category does not have enough highlights',
      {
        highlightsCount: resolvedCategory?.highlightsCount || 0,
      }
    );
  }

  const activeItems = (ranking.items || [])
    .filter((item) => item.status === 'active')
    .sort((first, second) => first.position - second.position);
  const topItems = activeItems.slice(0, MINIMUM_RANKING_ITEMS);

  if (activeItems.length < MINIMUM_RANKING_ITEMS) {
    addValidationError(
      validationErrors,
      'ranking.itemsCount',
      'Ranking does not have at least 10 active items',
      {
        activeItems: activeItems.length,
      }
    );
  }

  for (const item of topItems) {
    if (!item.product?.id) {
      addValidationError(validationErrors, 'rankingItem.product', 'Top item has no Product', {
        position: item.position,
        rankingItemId: item.id,
      });
      continue;
    }

    if (!item.affiliateLink?.id || item.affiliateLink.status !== 'active') {
      addValidationError(
        validationErrors,
        'rankingItem.affiliateLink',
        'Top item has no active AffiliateLink',
        {
          position: item.position,
          rankingItemId: item.id,
          productId: item.product.id,
        }
      );
    }

    if (item.product.price === null || item.product.price === undefined) {
      addValidationError(validationErrors, 'product.price', 'Top item Product has no price', {
        position: item.position,
        productId: item.product.id,
      });
    }

    if (!item.product.imageUrl) {
      addValidationError(validationErrors, 'product.image', 'Top item Product has no image', {
        position: item.position,
        productId: item.product.id,
      });
    }
  }

  return {
    ranking,
    validationErrors,
  };
};

const hasTermRelation = (title, term) => {
  const titleText = normalizeText(title);
  const termText = normalizeText(term);

  if (!termText) {
    return true;
  }

  if (titleText.includes(termText)) {
    return true;
  }

  const termTokens = tokenize(termText);

  return termTokens.some((token) => titleText.includes(token));
};

const hasForbiddenTitleTerm = (title) => {
  const normalizedTitle = normalizeText(title);

  return FORBIDDEN_TITLE_TERMS.some((term) => normalizedTitle.includes(normalizeText(term)));
};

const hasPattern = (text, patterns) => {
  return patterns.some((pattern) => pattern.test(text));
};

const findTemporalReferences = (text) => {
  return [
    ...(text.match(YEAR_PATTERN) || []),
    ...(text.match(DATE_PATTERN) || []),
    ...(text.match(MONTH_PATTERN) || []),
  ];
};

const buildPageText = (page) => {
  return [
    page.title,
    page.slug,
    page.excerpt,
    page.intro,
    page.conclusion,
    page.seo?.metaTitle,
    page.seo?.metaDescription,
    ...(page.faqs || []).flatMap((faq) => [faq.question, faq.answer]),
  ]
    .filter(Boolean)
    .join('\n');
};

const validateGeneratedPage = async (strapi, { pageId, seoId, faqIds, term }) => {
  const validationErrors = [];
  const page = await getPage(strapi, pageId);

  if (!page) {
    addValidationError(validationErrors, 'page.notFound', 'Generated Page not found', { pageId });

    return {
      page,
      validationErrors,
    };
  }

  const faqs = Array.isArray(page.faqs) ? page.faqs : [];
  const activeFaqs = faqs.filter((faq) => faq.status === 'active');
  const text = buildPageText(page);

  if (page.status !== 'draft') {
    addValidationError(validationErrors, 'page.status', 'Generated Page is not draft', {
      status: page.status,
    });
  }

  if (!page.seo?.id || page.seo.id !== seoId) {
    addValidationError(validationErrors, 'seo.exists', 'Generated Seo was not linked to Page', {
      seoId,
      pageSeoId: page.seo?.id || null,
    });
  }

  if (activeFaqs.length < MINIMUM_FAQS || (faqIds || []).length < MINIMUM_FAQS) {
    addValidationError(validationErrors, 'faqs.count', 'Generated Page has fewer than 3 FAQs', {
      activeFaqs: activeFaqs.length,
      faqIds: faqIds || [],
    });
  }

  if (!page.title || hasForbiddenTitleTerm(page.title)) {
    addValidationError(validationErrors, 'page.titleForbiddenTerm', 'Generated title contains blocked wording', {
      title: page.title,
    });
  }

  if (!hasTermRelation(page.title, term)) {
    addValidationError(validationErrors, 'page.titleTerm', 'Generated title does not clearly relate to term', {
      title: page.title,
      term,
    });
  }

  if (!page.slug || !hasTermRelation(page.slug, term)) {
    addValidationError(validationErrors, 'page.slugTerm', 'Generated slug does not clearly relate to term', {
      slug: page.slug,
      term,
    });
  }

  if (!page.seo?.metaTitle) {
    addValidationError(validationErrors, 'seo.metaTitle', 'Generated Seo has no metaTitle');
  }

  if (!page.seo?.metaDescription) {
    addValidationError(validationErrors, 'seo.metaDescription', 'Generated Seo has no metaDescription');
  }

  const temporalReferences = findTemporalReferences(text);

  if (temporalReferences.length) {
    addValidationError(validationErrors, 'content.temporal', 'Generated content contains temporal references', {
      temporalReferences,
    });
  }

  if (hasPattern(text, PLACEHOLDER_PATTERNS)) {
    addValidationError(validationErrors, 'content.placeholder', 'Generated content contains placeholder-like text');
  }

  if (hasPattern(page.intro || '', GENERIC_TEXT_PATTERNS)) {
    addValidationError(validationErrors, 'content.genericIntro', 'Generated intro is too generic');
  }

  return {
    page,
    validationErrors,
  };
};

const getNonApprovalReadinessErrors = (pageDetail) => {
  return (pageDetail.publicationReadiness?.pending || [])
    .filter((validation) => !APPROVAL_PENDING_KEYS.has(validation.key))
    .map((validation) => ({
      code: `publication.${validation.key}`,
      message: validation.message,
      key: validation.key,
    }));
};

const buildPublicUrl = (page) => {
  if (!page?.category?.slug || !page.slug) {
    return null;
  }

  return `/${page.category.slug}/${page.slug}`;
};

const verifyPublicAvailability = async (strapi, page) => {
  const publicUrl = buildPublicUrl(page);

  if (!publicUrl || !page.category?.slug) {
    return {
      publicUrl,
      endpointStatus: 404,
      sitemapIncluded: false,
    };
  }

  const publicService = strapi.service('api::public.public');
  const publicPage = await publicService.findPageBySlugs(page.category.slug, page.slug);
  const sitemap = await publicService.findSitemap();

  return {
    publicUrl,
    endpointStatus: publicPage ? 200 : 404,
    sitemapIncluded: sitemap.some((item) => item.url === publicUrl),
  };
};

const buildReviewResult = ({
  term,
  siteId,
  syncResult,
  pageId = null,
  seoId = null,
  faqIds = [],
  aiGenerationLogId = null,
  validationErrors,
  warnings,
  errors = [],
}) => ({
  success: true,
  term,
  siteId,
  rankingId: syncResult.editorialRanking.id,
  pageId,
  seoId,
  faqIds,
  aiGenerationLogId,
  published: false,
  requiresReview: true,
  publicUrl: null,
  sync: syncResult,
  validationErrors,
  warnings,
  errors,
});

const syncGenerateAndPublishMarketplaceRanking = async (
  strapi,
  { term, siteId = DEFAULT_SITE_ID, limit = DEFAULT_LIMIT, autoPublish = true } = {}
) => {
  if (!strapi?.db) {
    throw new Error('strapi instance is required');
  }

  const syncResult = await syncMarketplaceRankingByTerm(strapi, {
    term,
    siteId,
    limit,
  });
  const warnings = [...(syncResult.warnings || [])];
  const errors = [...(syncResult.errors || [])];
  const rankingId = syncResult.editorialRanking.id;
  const preGeneration = await validateRankingBeforeGeneration(
    strapi,
    rankingId,
    syncResult.resolvedCategory
  );

  if (preGeneration.validationErrors.length) {
    return buildReviewResult({
      term: syncResult.term,
      siteId,
      syncResult,
      validationErrors: preGeneration.validationErrors,
      warnings,
      errors,
    });
  }

  if (preGeneration.ranking?.page?.status === 'published') {
    warnings.push({
      step: 'auto-publish',
      message: 'Ranking already has a published Page; skipping generation and publication',
      pageId: preGeneration.ranking.page.id,
    });

    const publishedPage = await getPage(strapi, preGeneration.ranking.page.id);
    const publicCheck = await verifyPublicAvailability(strapi, publishedPage);

    return {
      success: true,
      term: syncResult.term,
      siteId,
      rankingId,
      pageId: publishedPage.id,
      seoId: publishedPage.seo?.id || null,
      faqIds: (publishedPage.faqs || []).map((faq) => faq.id),
      aiGenerationLogId: null,
      published: true,
      requiresReview: false,
      publicUrl: publicCheck.publicUrl,
      publicEndpointStatus: publicCheck.endpointStatus,
      sitemapIncluded: publicCheck.sitemapIncluded,
      sync: syncResult,
      validationErrors: [],
      warnings,
      errors,
    };
  }

  const generated = await generatePageFromRanking(strapi, {
    rankingId,
  });
  const generatedPageValidation = await validateGeneratedPage(strapi, {
    pageId: generated.pageId,
    seoId: generated.seoId,
    faqIds: generated.faqIds,
    term: syncResult.term,
  });

  if (generatedPageValidation.validationErrors.length) {
    return buildReviewResult({
      term: syncResult.term,
      siteId,
      syncResult,
      pageId: generated.pageId,
      seoId: generated.seoId,
      faqIds: generated.faqIds,
      aiGenerationLogId: generated.aiGenerationLogId,
      validationErrors: generatedPageValidation.validationErrors,
      warnings,
      errors,
    });
  }

  if (!autoPublish) {
    return buildReviewResult({
      term: syncResult.term,
      siteId,
      syncResult,
      pageId: generated.pageId,
      seoId: generated.seoId,
      faqIds: generated.faqIds,
      aiGenerationLogId: generated.aiGenerationLogId,
      validationErrors: [
        {
          code: 'autoPublish.disabled',
          message: 'autoPublish is disabled',
        },
      ],
      warnings,
      errors,
    });
  }

  const pageDetail = await publicationWorkflow.getPage(strapi, generated.pageId);
  const readinessErrors = getNonApprovalReadinessErrors(pageDetail);

  if (readinessErrors.length) {
    return buildReviewResult({
      term: syncResult.term,
      siteId,
      syncResult,
      pageId: generated.pageId,
      seoId: generated.seoId,
      faqIds: generated.faqIds,
      aiGenerationLogId: generated.aiGenerationLogId,
      validationErrors: readinessErrors,
      warnings,
      errors,
    });
  }

  const approved = await publicationWorkflow.approvePage(strapi, generated.pageId);
  const approvedReadinessErrors = approved.publicationReadiness?.ready
    ? []
    : (approved.publicationReadiness?.pending || []).map((validation) => ({
        code: `publication.${validation.key}`,
        message: validation.message,
        key: validation.key,
      }));

  if (approvedReadinessErrors.length) {
    return buildReviewResult({
      term: syncResult.term,
      siteId,
      syncResult,
      pageId: generated.pageId,
      seoId: generated.seoId,
      faqIds: generated.faqIds,
      aiGenerationLogId: generated.aiGenerationLogId,
      validationErrors: approvedReadinessErrors,
      warnings,
      errors,
    });
  }

  const published = await publicationWorkflow.publishPage(strapi, generated.pageId);
  const publishedPage = await getPage(strapi, generated.pageId);
  const publicCheck = await verifyPublicAvailability(strapi, publishedPage);

  return {
    success: true,
    term: syncResult.term,
    siteId,
    rankingId,
    pageId: generated.pageId,
    seoId: generated.seoId,
    faqIds: generated.faqIds,
    aiGenerationLogId: generated.aiGenerationLogId,
    published: published.status === 'published',
    requiresReview: false,
    publicUrl: publicCheck.publicUrl,
    publicEndpointStatus: publicCheck.endpointStatus,
    sitemapIncluded: publicCheck.sitemapIncluded,
    sync: syncResult,
    validationErrors: [],
    warnings,
    errors,
  };
};

module.exports = {
  syncGenerateAndPublishMarketplaceRanking,
};
