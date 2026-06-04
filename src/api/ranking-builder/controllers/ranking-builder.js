'use strict';

const getService = () => strapi.service('api::ranking-builder.ranking-builder');

module.exports = {
  async find(ctx) {
    try {
      ctx.body = {
        success: true,
        rankings: await getService().list(),
      };
    } catch (error) {
      strapi.log.warn(`[Ranking Builder] List failed: ${error.message}`);

      return ctx.badRequest(error.message);
    }
  },

  async findOne(ctx) {
    try {
      ctx.body = {
        success: true,
        ranking: await getService().get(ctx.params.id),
      };
    } catch (error) {
      strapi.log.warn(`[Ranking Builder] Find failed: ${error.message}`);

      return ctx.notFound(error.message);
    }
  },

  async create(ctx) {
    try {
      ctx.body = {
        success: true,
        ranking: await getService().create(ctx.request.body || {}),
      };
    } catch (error) {
      strapi.log.warn(`[Ranking Builder] Create failed: ${error.message}`);

      return ctx.badRequest(error.message);
    }
  },

  async update(ctx) {
    try {
      ctx.body = {
        success: true,
        ranking: await getService().update(ctx.params.id, ctx.request.body || {}),
      };
    } catch (error) {
      strapi.log.warn(`[Ranking Builder] Update failed: ${error.message}`);

      return ctx.badRequest(error.message);
    }
  },
};
