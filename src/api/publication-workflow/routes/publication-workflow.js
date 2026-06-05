'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/internal/publication/pages',
      handler: 'publication-workflow.find',
      config: {
        auth: false,
        policies: [],
        description: 'List pages pending publication workflow review',
      },
    },
    {
      method: 'GET',
      path: '/internal/publication/pages/:id',
      handler: 'publication-workflow.findOne',
      config: {
        auth: false,
        policies: [],
        description: 'Get one page with publication readiness details',
      },
    },
    {
      method: 'PUT',
      path: '/internal/publication/pages/:id',
      handler: 'publication-workflow.update',
      config: {
        auth: false,
        policies: [],
        description: 'Update editable Page, Seo and Faq fields during publication review',
      },
    },
    {
      method: 'POST',
      path: '/internal/publication/pages/:id/approve',
      handler: 'publication-workflow.approve',
      config: {
        auth: false,
        policies: [],
        description: 'Approve one draft page, SEO and FAQs before publication',
      },
    },
    {
      method: 'POST',
      path: '/internal/publication/pages/:id/publish',
      handler: 'publication-workflow.publish',
      config: {
        auth: false,
        policies: [],
        description: 'Publish one approved page after publication readiness validation',
      },
    },
  ],
};
