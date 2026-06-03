'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/internal/marketplaces/mercado-livre/search',
      handler: 'mercado-livre.search',
      config: {
        auth: false,
        policies: [],
        description: 'Search Mercado Livre products by term for internal import workflows',
      },
    },
    {
      method: 'POST',
      path: '/internal/marketplaces/mercado-livre/import',
      handler: 'mercado-livre.import',
      config: {
        auth: false,
        policies: [],
        description: 'Import selected Mercado Livre products into existing content types',
      },
    },
  ],
};
