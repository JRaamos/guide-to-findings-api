'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/internal/marketplaces/mercado-livre/ranking-chat',
      handler: 'mercado-livre.rankingChat',
      config: {
        auth: false,
        policies: [],
        description: 'Generate and optionally publish a Mercado Livre ranking from one operator term',
      },
    },
  ],
};
