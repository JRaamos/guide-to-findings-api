'use strict';

module.exports = {
  async findPage(ctx) {
    const { categorySlug, contentSlug } = ctx.params;
    const publicService = strapi.service('api::public.public');

    const page = await publicService.findPageBySlugs(categorySlug, contentSlug);

    if (!page) {
      return ctx.notFound('Page not found');
    }

    ctx.body = page;
  },
};
