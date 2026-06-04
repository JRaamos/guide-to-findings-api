'use strict';

module.exports = {
  async search(ctx) {
    const mercadoLivreService = strapi.service('api::mercado-livre.mercado-livre');

    try {
      ctx.body = await mercadoLivreService.search(ctx.request.body || {});
    } catch (error) {
      strapi.log.warn(`[Mercado Livre] Search failed: ${error.message}`);

      if (error.status === 429) {
        ctx.status = 429;
        ctx.body = {
          error: 'Mercado Livre rate limit reached',
        };

        return;
      }

      return ctx.badRequest(error.message);
    }
  },

  async import(ctx) {
    const mercadoLivreService = strapi.service('api::mercado-livre.mercado-livre');

    try {
      ctx.body = await mercadoLivreService.import(ctx.request.body || {});
    } catch (error) {
      strapi.log.warn(`[Mercado Livre] Import failed: ${error.message}`);

      return ctx.badRequest(error.message);
    }
  },
};
