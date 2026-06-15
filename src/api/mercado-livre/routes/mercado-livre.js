'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/internal/marketplaces/mercado-livre/ranking-chat-preview',
      handler: 'mercado-livre.disabledInternalRoute',
      config: {
        auth: false,
        description: 'Disabled legacy Content API route for ranking generator preview',
      },
    },
    {
      method: 'POST',
      path: '/internal/marketplaces/mercado-livre/ranking-chat',
      handler: 'mercado-livre.disabledInternalRoute',
      config: {
        auth: false,
        description: 'Disabled legacy Content API route for ranking generator generation',
      },
    },
  ],
};
