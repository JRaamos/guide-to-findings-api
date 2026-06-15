'use strict';

const {
  syncGenerateAndPublishMarketplaceRanking,
} = require('../../../services/marketplaces/mercado-livre/ranking-auto-publish');
const {
  buildRankingChatPreview,
} = require('../../../services/marketplaces/mercado-livre/ranking-chat-preview');

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
  rankingChatPreview(payload = {}) {
    const message = normalizeTerm(payload.message || payload.term);

    if (!message) {
      throw new Error('message is required');
    }

    return buildRankingChatPreview(strapi, {
      message,
      siteId: payload.siteId || process.env.MERCADO_LIVRE_SITE_ID || DEFAULT_SITE_ID,
      limit: payload.limit,
      fetchLimit: payload.fetchLimit,
      displayLimit: payload.displayLimit,
    });
  },

  async rankingChat(payload = {}) {
    const message = normalizeTerm(payload.message || payload.term);

    if (!message) {
      throw new Error('message is required');
    }

    const result = await syncGenerateAndPublishMarketplaceRanking(strapi, {
      message,
      siteId: payload.siteId || process.env.MERCADO_LIVRE_SITE_ID || DEFAULT_SITE_ID,
      limit: payload.limit || DEFAULT_LIMIT,
      fetchLimit: payload.fetchLimit,
      displayLimit: payload.displayLimit,
      editorialTemplate: payload.editorialTemplate,
      editorialIntent: payload.editorialIntent,
      intentModifier: payload.intentModifier,
      preferredSlug: payload.preferredSlug,
      titleHint: payload.titleHint,
      autoPublish: normalizeBoolean(payload.autoPublish, true),
    });

    return buildChatResponse(result);
  },
});
