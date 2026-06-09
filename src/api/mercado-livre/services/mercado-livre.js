'use strict';

const {
  syncGenerateAndPublishMarketplaceRanking,
} = require('../../../services/marketplaces/mercado-livre/ranking-auto-publish');

const DEFAULT_SITE_ID = 'MLB';
const DEFAULT_LIMIT = 20;

const normalizeTerm = (term) => {
  return typeof term === 'string' ? term.trim() : '';
};

const normalizeBoolean = (value, fallback) => {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
};

const buildOperatorSummary = (result) => {
  if (result.published) {
    return `Ranking publicado para "${result.term}".`;
  }

  if (result.requiresReview) {
    return `Ranking gerado para "${result.term}" e enviado para revisao.`;
  }

  return `Fluxo concluido para "${result.term}".`;
};

const buildChatResponse = (result) => ({
  ...result,
  operatorSummary: buildOperatorSummary(result),
  operatorStatus: result.published ? 'published' : result.requiresReview ? 'requiresReview' : 'completed',
  reviewPageId: result.requiresReview ? result.pageId : null,
});

module.exports = () => ({
  async rankingChat(payload = {}) {
    const term = normalizeTerm(payload.term);

    if (!term) {
      throw new Error('term is required');
    }

    const result = await syncGenerateAndPublishMarketplaceRanking(strapi, {
      term,
      siteId: payload.siteId || process.env.MERCADO_LIVRE_SITE_ID || DEFAULT_SITE_ID,
      limit: payload.limit || DEFAULT_LIMIT,
      autoPublish: normalizeBoolean(payload.autoPublish, true),
    });

    return buildChatResponse(result);
  },
});
