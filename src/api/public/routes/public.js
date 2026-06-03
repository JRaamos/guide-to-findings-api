'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/public/pages/:categorySlug/:contentSlug',
      handler: 'public.findPage',
      config: {
        auth: false,
        policies: [],
        description: 'Find a published dynamic page by category and content slugs',
      },
    },
  ],
};
