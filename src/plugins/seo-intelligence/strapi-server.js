'use strict';

const topicQueue = require('../../services/seo-intelligence/topic-queue');

module.exports = () => ({
  routes: {
    admin: {
      type: 'admin',
      routes: [
        {
          method: 'GET',
          path: '/topics',
          handler: 'topics.find',
          config: {
            policies: ['admin::isAuthenticatedAdmin'],
          },
        },
        {
          method: 'POST',
          path: '/topics/:id/approve',
          handler: 'topics.approve',
          config: {
            policies: ['admin::isAuthenticatedAdmin'],
          },
        },
        {
          method: 'POST',
          path: '/topics/:id/reject',
          handler: 'topics.reject',
          config: {
            policies: ['admin::isAuthenticatedAdmin'],
          },
        },
        {
          method: 'POST',
          path: '/topics/:id/pending',
          handler: 'topics.pending',
          config: {
            policies: ['admin::isAuthenticatedAdmin'],
          },
        },
        {
          method: 'POST',
          path: '/topics/:id/generate',
          handler: 'topics.generate',
          config: {
            policies: ['admin::isAuthenticatedAdmin'],
          },
        },
      ],
    },
  },
  controllers: {
    topics: {
      async find(ctx) {
        try {
          ctx.body = {
            success: true,
            ...(await topicQueue.listTopics(strapi, ctx.query || {})),
          };
        } catch (error) {
          strapi.log.warn(`[SEO Intelligence] List topics failed: ${error.message}`);

          return ctx.badRequest(error.message);
        }
      },

      async approve(ctx) {
        try {
          ctx.body = {
            success: true,
            ...(await topicQueue.approveTopic(strapi, ctx.params.id)),
          };
        } catch (error) {
          strapi.log.warn(`[SEO Intelligence] Approve topic failed: ${error.message}`);

          return ctx.badRequest(error.message);
        }
      },

      async reject(ctx) {
        try {
          ctx.body = {
            success: true,
            ...(await topicQueue.rejectTopic(strapi, ctx.params.id)),
          };
        } catch (error) {
          strapi.log.warn(`[SEO Intelligence] Reject topic failed: ${error.message}`);

          return ctx.badRequest(error.message);
        }
      },

      async pending(ctx) {
        try {
          ctx.body = {
            success: true,
            ...(await topicQueue.moveTopicToPending(strapi, ctx.params.id)),
          };
        } catch (error) {
          strapi.log.warn(`[SEO Intelligence] Move topic to pending failed: ${error.message}`);

          return ctx.badRequest(error.message);
        }
      },

      async generate(ctx) {
        try {
          ctx.body = {
            success: true,
            ...(await topicQueue.generateTopicPage(strapi, { topicId: ctx.params.id })),
          };
        } catch (error) {
          strapi.log.warn(`[SEO Intelligence] Generate topic page failed: ${error.message}`);

          return ctx.badRequest(error.message);
        }
      },
    },
  },
});
