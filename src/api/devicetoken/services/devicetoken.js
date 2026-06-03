'use strict';

/**
 * devicetoken service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::devicetoken.devicetoken');
