'use strict';

const getService = () => strapi.service('api::ai-generator.ai-generator');

module.exports = {
  async generatePage(ctx) {
    try {
      ctx.body = await getService().generatePage(ctx.request.body || {});
    } catch (error) {
      strapi.log.warn(`[AI Generator] Generate page failed: ${error.message}`);

      return ctx.badRequest(error.message);
    }
  },
};
