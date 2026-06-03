'use strict';

/**
 * support router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::support.support', {
  config: {
    find: {
      policies: [
        {
          name: 'global::is-owner',
          config: {
            contentType: 'api::support.support',
            ownerField: 'user',
          },
        },
      ],
    },
    findOne: {
      policies: [
        {
          name: 'global::is-owner',
          config: {
            contentType: 'api::support.support',
            ownerField: 'user',
          },
        },
      ],
    },
    create: {
      policies: [
        {
          name: 'global::is-owner',
          config: {
            contentType: 'api::support.support',
            ownerField: 'user',
          },
        },
      ],
    },
    update: {
      policies: [
        {
          name: 'global::is-owner',
          config: {
            contentType: 'api::support.support',
            ownerField: 'user',
          },
        },
      ],
    },
    delete: {
      policies: [
        {
          name: 'global::is-owner',
          config: {
            contentType: 'api::support.support',
            ownerField: 'user',
          },
        },
      ],
    },
  },
});
