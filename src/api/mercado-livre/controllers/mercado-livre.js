'use strict';

module.exports = {
  async disabledInternalRoute(ctx) {
    return ctx.forbidden('This internal Content API route was moved to the Strapi Admin API.');
  },

  async rankingChatPreview(ctx) {
    const mercadoLivreService = strapi.service('api::mercado-livre.mercado-livre');

    try {
      ctx.body = await mercadoLivreService.rankingChatPreview(ctx.request.body || {});
    } catch (error) {
      strapi.log.warn(`[Mercado Livre] Ranking chat preview failed: ${error.message}`);

      return ctx.badRequest(error.message);
    }
  },

  async rankingChat(ctx) {
    const mercadoLivreService = strapi.service('api::mercado-livre.mercado-livre');

    try {
      ctx.body = await mercadoLivreService.rankingChat(ctx.request.body || {});
    } catch (error) {
      strapi.log.warn(`[Mercado Livre] Ranking chat failed: ${error.message}`);

      return ctx.badRequest(error.message);
    }
  },
};
