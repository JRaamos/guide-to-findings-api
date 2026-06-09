'use strict';

module.exports = {
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
