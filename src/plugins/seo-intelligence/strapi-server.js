'use strict';

const topicQueue = require('../../services/seo-intelligence/topic-queue');
const topicClusters = require('../../services/seo-intelligence/topic-clusters');
const {
  discoverAndImportTopics,
} = require('../../services/seo-intelligence/topic-discovery-import');
const {
  getDiscoveryWorkspaceDetail,
  listDiscoveryWorkspaces,
} = require('../../services/seo-intelligence/discovery-workspaces');

module.exports = () => ({
  routes: {
    admin: {
      type: 'admin',
      routes: [
        {
          method: 'GET',
          path: '/workspaces',
          handler: 'workspaces.find',
          config: {
            policies: ['admin::isAuthenticatedAdmin'],
          },
        },
        {
          method: 'GET',
          path: '/workspaces/:id',
          handler: 'workspaces.findOne',
          config: {
            policies: ['admin::isAuthenticatedAdmin'],
          },
        },
        {
          method: 'GET',
          path: '/topics',
          handler: 'topics.find',
          config: {
            policies: ['admin::isAuthenticatedAdmin'],
          },
        },
        {
          method: 'GET',
          path: '/clusters',
          handler: 'clusters.find',
          config: {
            policies: ['admin::isAuthenticatedAdmin'],
          },
        },
        {
          method: 'POST',
          path: '/topics/discover',
          handler: 'topics.discover',
          config: {
            policies: ['admin::isAuthenticatedAdmin'],
          },
        },
        {
          method: 'POST',
          path: '/topics/bulk-generate',
          handler: 'topics.bulkGenerate',
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
    workspaces: {
      async find(ctx) {
        try {
          const workspaces = await listDiscoveryWorkspaces(strapi, {
            includeArchived: ctx.query?.includeArchived === 'true',
          });

          ctx.body = {
            success: true,
            workspaces,
            count: workspaces.length,
          };
        } catch (error) {
          strapi.log.warn(`[SEO Intelligence] List workspaces failed: ${error.message}`);

          return ctx.badRequest(error.message);
        }
      },
      async findOne(ctx) {
        try {
          ctx.body = {
            success: true,
            ...(await getDiscoveryWorkspaceDetail(strapi, ctx.params.id)),
          };
        } catch (error) {
          strapi.log.warn(`[SEO Intelligence] Workspace detail failed: ${error.message}`);

          return ctx.badRequest(error.message);
        }
      },
    },

    clusters: {
      async find(ctx) {
        try {
          const clusters = await topicClusters.getTopicClusters(strapi, {
            limit: ctx.query?.limit,
            includePages: true,
            workspaceId: ctx.query?.workspaceId,
          });

          ctx.body = {
            success: true,
            clusters,
            count: clusters.length,
          };
        } catch (error) {
          strapi.log.warn(`[SEO Intelligence] List clusters failed: ${error.message}`);

          return ctx.badRequest(error.message);
        }
      },
    },

    topics: {
      async discover(ctx) {
        try {
          ctx.body = await discoverAndImportTopics(strapi, {
            term: ctx.request.body?.term,
            source: ctx.request.body?.source,
          });
        } catch (error) {
          strapi.log.warn(`[SEO Intelligence] Topic discovery failed: ${error.message}`);

          return ctx.badRequest(error.message);
        }
      },

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

      async bulkGenerate(ctx) {
        try {
          ctx.body = {
            success: true,
            ...(await topicQueue.bulkGenerateApprovedTopics(strapi, {
              limit: ctx.request.body?.limit,
            })),
          };
        } catch (error) {
          strapi.log.warn(`[SEO Intelligence] Bulk generate topics failed: ${error.message}`);

          return ctx.badRequest(error.message);
        }
      },
    },
  },
});
