'use strict';

/**
 * A set of functions called "actions" for `notifier`
 */

module.exports = {

  notifications: async (ctx) => {
      const { params: params, state: { user: user }, request: { body: body, query: query, header} } = ctx;

      const register = await strapi.query('api::notification.notification').findMany({ 
        where:{
          user: user.id
        }
       });

      return ctx.send([
          ...register
      ]);
  },
  saveDeviceToken: async (ctx) => {
      const { params: params, state: { user: user }, request: { body: body, query: query, header} } = ctx;

      let register = await strapi.query('api::devicetoken.devicetoken').findOne({ 
        where:{
          user: user.id, ...body
        }
       });
      if(!register?.id){
          register = await strapi.query('api::devicetoken.devicetoken').create({ 
            data:{
              user: user.id, ...body
            }
          });
      }

      return ctx.send({ 
          ...register
      });
  },
  updateNotification: async (ctx) => {
      const { params: params, state: { user: user }, request: { body: body, query: query, header} } = ctx;

      let register = await strapi.query('api::notification.notification').update({
        where:{ id: params.id }, 
        data: { ...body }
      });

      return ctx.send({ 
          ...register
      });
  },
  remove: async (ctx) => {
      const { params: params, state: { user: user }, request: { body: body, query: query, header} } = ctx;

      const register = await strapi.query('api::notification.notification').delete({ 
        where:{
          user: user.id, id: params.id
        }
       });

      return ctx.send({ 
          ...register
      });
  },
  removeAll: async (ctx) => {
      const { params: params, state: { user: user }, request: { body: body, query: query, header} } = ctx;

      const register = await strapi.query('api::notification.notification').delete({ 
        where:{
          user: user.id
        }
      });

      return ctx.send({ 
          ...register
      });
  },
};






