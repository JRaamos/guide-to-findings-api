'use strict';

const getMercadoLivreController = () => strapi.controller('api::mercado-livre.mercado-livre');

module.exports = () => ({
  routes: {
    admin: {
      type: 'admin',
      routes: [
        {
          method: 'POST',
          path: '/preview',
          handler: 'mercadoLivre.preview',
          config: {
            policies: ['admin::isAuthenticatedAdmin'],
          },
        },
        {
          method: 'POST',
          path: '/generate',
          handler: 'mercadoLivre.generate',
          config: {
            policies: ['admin::isAuthenticatedAdmin'],
          },
        },
      ],
    },
  },
  controllers: {
    mercadoLivre: {
      preview(ctx) {
        return getMercadoLivreController().rankingChatPreview(ctx);
      },

      generate(ctx) {
        return getMercadoLivreController().rankingChat(ctx);
      },
    },
  },
});
