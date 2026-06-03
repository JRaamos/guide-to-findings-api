'use strict';

module.exports = {
  async findCategories(ctx) {
    const publicService = strapi.service('api::public.public');

    ctx.body = await publicService.findCategories();
  },

  async findCategory(ctx) {
    const { categorySlug } = ctx.params;
    const publicService = strapi.service('api::public.public');

    const category = await publicService.findCategoryBySlug(categorySlug);

    if (!category) {
      return ctx.notFound('Category not found');
    }

    ctx.body = category;
  },

  async findSitemap(ctx) {
    const publicService = strapi.service('api::public.public');

    ctx.body = await publicService.findSitemap();
  },

  async createClickEvent(ctx) {
    const publicService = strapi.service('api::public.public');

    await publicService.createClickEvent({
      payload: ctx.request.body || {},
      userAgent: ctx.get('user-agent'),
      referrer: ctx.get('referer') || ctx.get('referrer'),
      ip: ctx.request.ip,
    });

    ctx.body = { success: true };
  },

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
