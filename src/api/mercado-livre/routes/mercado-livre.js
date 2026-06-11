'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/internal/marketplaces/mercado-livre/ranking-chat-preview',
      handler: 'mercado-livre.rankingChatPreview',
      config: {
        auth: false,
        policies: ['admin::isAuthenticatedAdmin'],
        description: 'Preview Mercado Livre ranking generation context without persistence',
      },
    },
    {
      method: 'POST',
      path: '/internal/marketplaces/mercado-livre/ranking-chat',
      handler: 'mercado-livre.rankingChat',
      config: {
        auth: false,
        policies: ['admin::isAuthenticatedAdmin'],
        description: 'Generate and optionally publish a Mercado Livre ranking from one operator term',
      },
    },
  ],
};
