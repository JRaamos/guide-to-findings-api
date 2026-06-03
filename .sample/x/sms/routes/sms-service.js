'use strict';

/**
 * sms-service router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::sms-service.sms-service');