'use strict';

module.exports = {
  async search(ctx) {
    const mercadoLivreService = strapi.service('api::mercado-livre.mercado-livre');

    try {
      ctx.body = await mercadoLivreService.search(ctx.request.body || {});
    } catch (error) {
      return ctx.badRequest(error.message);
    }
  },

  async import(ctx) {
    const mercadoLivreService = strapi.service('api::mercado-livre.mercado-livre');

    try {
      ctx.body = await mercadoLivreService.import(ctx.request.body || {});
    } catch (error) {
      return ctx.badRequest(error.message);
    }
  },
};
