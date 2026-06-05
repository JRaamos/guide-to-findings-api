'use strict';

const getService = () => strapi.service('api::publication-workflow.publication-workflow');

module.exports = {
  async find(ctx) {
    try {
      ctx.body = {
        success: true,
        pages: await getService().listPages(),
      };
    } catch (error) {
      strapi.log.warn(`[Publication Workflow] List pages failed: ${error.message}`);

      return ctx.badRequest(error.message);
    }
  },

  async findOne(ctx) {
    try {
      ctx.body = {
        success: true,
        page: await getService().getPage(ctx.params.id),
      };
    } catch (error) {
      strapi.log.warn(`[Publication Workflow] Find page failed: ${error.message}`);

      return ctx.notFound(error.message);
    }
  },

  async update(ctx) {
    try {
      ctx.body = {
        success: true,
        page: await getService().updatePage(ctx.params.id, ctx.request.body || {}),
      };
    } catch (error) {
      strapi.log.warn(`[Publication Workflow] Update page failed: ${error.message}`);

      return ctx.badRequest(error.message);
    }
  },

  async approve(ctx) {
    try {
      ctx.body = {
        success: true,
        page: await getService().approvePage(ctx.params.id),
      };
    } catch (error) {
      strapi.log.warn(`[Publication Workflow] Approve page failed: ${error.message}`);

      return ctx.badRequest(error.message);
    }
  },

  async publish(ctx) {
    try {
      ctx.body = {
        success: true,
        page: await getService().publishPage(ctx.params.id),
      };
    } catch (error) {
      strapi.log.warn(`[Publication Workflow] Publish page failed: ${error.message}`);

      return ctx.badRequest(error.message);
    }
  },
};
