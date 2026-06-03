'use strict';

const { send } = require('../services/sms-service');

/**
 * sms-service controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController(
	'api::sms-service.sms-service',
	({ strapi }) => ({
		async create(ctx) {
			const { phone } = ctx.request.body;

			if (!phone) return ctx.badRequest("phone is empty");
			const code = Math.floor(1000 + Math.random() * 9000);
			const save = await strapi.db.query('api::sms-service.sms-service').create({ data: { code, phone } });
			if (!save?.id) return ctx.badRequest("error in generate code");

			return await send(code, phone);
		},
		async validate(ctx) {
			const { code, phone } = ctx.request.body;

			if (!phone) return ctx.badRequest("phone is empty");
			if (!code) return ctx.badRequest("code is empty");

			const data = await strapi.db.query('api::sms-service.sms-service').findOne({
				where: {
					phone,
					code
				}
			});

			if (!data?.id) return ctx.badRequest("incorrect validation")

			return await strapi.db.query('api::sms-service.sms-service').delete({ where: { id: data.id } });
		},
		async login(ctx) {
			const { code, phone } = ctx.request.body;

			if (!phone) return ctx.badRequest("phone is empty");
			if (!code) return ctx.badRequest("code is empty");

			const data = await strapi.db.query('api::sms-service.sms-service').findOne({
				where: {
					phone,
					code
				}
			});

			if (!data?.id) return ctx.badRequest("incorrect validation")

			const user = await strapi.db.query("plugin::users-permissions.user").findOne({
				where: {
					phone
				}
			});

			if (!user) return ctx.badRequest("user not exist");

			const jwtToken = strapi.plugins['users-permissions'].services.jwt.issue({
				id: user.id
			});

			delete user.password;
			await strapi.db.query('api::sms-service.sms-service').delete({ where: { id: data.id } });

			return {
				jwt: jwtToken,
				user: user
			};
		},
	})
);