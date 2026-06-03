'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/public/categories',
      handler: 'public.findCategories',
      config: {
        auth: false,
        policies: [],
        description: 'List active public categories',
      },
    },
    {
      method: 'GET',
      path: '/public/categories/:categorySlug',
      handler: 'public.findCategory',
      config: {
        auth: false,
        policies: [],
        description: 'Find an active public category by slug',
      },
    },
    {
      method: 'GET',
      path: '/public/sitemap',
      handler: 'public.findSitemap',
      config: {
        auth: false,
        policies: [],
        description: 'List public indexable URLs for sitemap generation',
      },
    },
    {
      method: 'POST',
      path: '/public/click-events',
      handler: 'public.createClickEvent',
      config: {
        auth: false,
        policies: [],
        description: 'Register a public click event',
      },
    },
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
