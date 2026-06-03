'use strict';

const bcrypt = require('bcrypt');

/**
 * A set of functions called "actions" for `me`
 */

module.exports = {
  read: async (ctx) => {
    const { state: { user } } = ctx;
    const meService = strapi.service('api::me.me');

    const register = await meService.readUserWithProfile(user.id);
    return meService.serializeMeResponse(register);
  },
  update: async (ctx) => {
    const { state: { user }, request: { body } } = ctx;
    const meService = strapi.service('api::me.me');
    const { userData, profileData } = meService.splitPayload(body);

    if (Object.keys(userData).length > 0) {
      await strapi.entityService.update('plugin::users-permissions.user', user.id, {
        data: userData,
      });
    }

    await meService.saveProfile(user.id, profileData);

    const register = await meService.readUserWithProfile(user.id);
    return meService.serializeMeResponse(register);
  },
  updatePassword: async (ctx) => {
    const { state: { user }, request: { body } } = ctx;
    const meService = strapi.service('api::me.me');

    if (!body.password) { return ctx.badRequest("A senha é obrigatória.", { code: "BadRequest", status: "400" }); }

    const password = bcrypt.hashSync(body.password, 10);
    await strapi.query("plugin::users-permissions.user").update({
      where: {
        id: user.id
      },
      data: {
        password: password,
        id: user.id
      }
    });

    const register = await meService.readUserWithProfile(user.id);
    return meService.serializeMeResponse(register);
  },
  remove: async (ctx) => {
    const { state: { user } } = ctx;
    const meService = strapi.service('api::me.me');

    await meService.removeProfile(user.id);

    const register = await strapi.db.query("plugin::users-permissions.user").delete({
      where: {
        id: user.id
      }
    });

    return register;
  },
};
