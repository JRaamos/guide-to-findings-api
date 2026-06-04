'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/internal/rankings',
      handler: 'ranking-builder.find',
      config: {
        auth: false,
        policies: [],
        description: 'List rankings for internal Ranking Builder workflows',
      },
    },
    {
      method: 'GET',
      path: '/internal/rankings/:id',
      handler: 'ranking-builder.findOne',
      config: {
        auth: false,
        policies: [],
        description: 'Find one ranking for internal Ranking Builder workflows',
      },
    },
    {
      method: 'POST',
      path: '/internal/rankings',
      handler: 'ranking-builder.create',
      config: {
        auth: false,
        policies: [],
        description: 'Create or update one ranking from selected products',
      },
    },
    {
      method: 'PUT',
      path: '/internal/rankings/:id',
      handler: 'ranking-builder.update',
      config: {
        auth: false,
        policies: [],
        description: 'Update one ranking and reuse ranking items by product',
      },
    },
  ],
};
