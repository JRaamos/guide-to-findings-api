'use strict';

const { runMarketplacePipeline } = require('./marketplace-pipeline');

const DEFAULT_SITE_ID = 'MLB';
const DEFAULT_LIMIT = 20;

const toLegacyResult = (pipelineResult) => ({
  success: pipelineResult.success,
  term: pipelineResult.term,
  siteId: pipelineResult.siteId,
  editorialPlan: pipelineResult.editorialPlan,
  pageReuse: pipelineResult.pageReuse,
  rankingId: pipelineResult.editorialRanking.id,
  pageId: pipelineResult.ai.pageId,
  seoId: pipelineResult.ai.seoId,
  faqIds: pipelineResult.ai.faqIds,
  aiGenerationLogId: pipelineResult.ai.aiGenerationLogId,
  published: pipelineResult.publication.published,
  requiresReview: pipelineResult.publication.requiresReview,
  publicUrl: pipelineResult.publication.publicUrl,
  publicEndpointStatus: pipelineResult.publication.publicEndpointStatus,
  sitemapIncluded: pipelineResult.publication.sitemapIncluded,
  sync: {
    success: pipelineResult.success,
    term: pipelineResult.term,
    siteId: pipelineResult.siteId,
    editorialPlan: pipelineResult.editorialPlan,
    pageReuse: pipelineResult.pageReuse,
    category: pipelineResult.category,
    marketplaceRanking: pipelineResult.marketplaceRanking,
    products: pipelineResult.products,
    editorialRanking: pipelineResult.editorialRanking,
    warnings: pipelineResult.warnings,
    errors: pipelineResult.errors,
  },
  validationErrors: pipelineResult.publication.validationErrors,
  warnings: pipelineResult.warnings,
  errors: pipelineResult.errors,
  pipeline: pipelineResult,
});

const syncGenerateAndPublishMarketplaceRanking = async (
  strapi,
  { term, siteId = DEFAULT_SITE_ID, limit = DEFAULT_LIMIT, autoPublish = true } = {}
) => {
  const pipelineResult = await runMarketplacePipeline(strapi, {
    term,
    siteId,
    limit,
    autoGenerate: true,
    autoPublish,
  });

  return toLegacyResult(pipelineResult);
};

module.exports = {
  syncGenerateAndPublishMarketplaceRanking,
};
