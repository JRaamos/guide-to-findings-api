"use strict";

module.exports = async (policyContext, config, { strapi }) => {
    const { user } = policyContext.state;
    const ctx = policyContext;

    if (!user) return false;

    ctx.request.query.filters ??= {};
    ctx.request.query.filters.user ??= {};
    ctx.request.query.filters.user.id = { $eq: user.id };

    return true;
};
