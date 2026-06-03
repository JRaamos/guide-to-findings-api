'use strict';

/**
 * A set of functions called "actions" for `mail`
 */

module.exports = {
  sendProcessLink: async (ctx, next) => {
    try {
      const { userId, processId } = ctx.request.body

      if(!userId) return ctx.badRequest("empty userId")
      if(!processId) return ctx.badRequest("empty processId")

      const user = await strapi.db.query("plugin::users-permissions.user").findOne({
        where: {
          id: userId
        }
      });

      if(!user?.id) return ctx.badRequest("user not exist")

      const process = await strapi.db.query('api::process.process').findOne({
        where: {
          id: processId
        }
      })

      if(!process?.id) return ctx.badRequest("process not exist")
      if(!process?.link) return ctx.badRequest("process not exist link")

      const message = `<p> Olá ${user.username} segue o link para a reunião:</p>`
      message += `<div>${process.link}</div>`

      const email = await strapi.plugins['email'].services.email.send({
        to: user.email,
        from: process.env.MAIL_DEFAULT_FROM,
        replyTo: process.env.MAIL_DEFAULT_FROM,
        subject: 'Link para reunião',
        html: message,
      })

      ctx.body = email
      
    } catch (err) {
      ctx.body = err;
    }
  }
};
