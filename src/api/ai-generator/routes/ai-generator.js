'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/internal/ai-generator/generate-page',
      handler: 'ai-generator.generatePage',
      config: {
        auth: false,
        policies: [],
        description: 'Generate draft Page, Seo and Faq content from an internal Ranking',
      },
    },
  ],
};
