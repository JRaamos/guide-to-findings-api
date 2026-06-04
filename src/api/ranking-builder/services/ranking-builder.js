'use strict';

const rankingBuilder = require('../../../services/ranking-builder');

module.exports = () => ({
  async list() {
    return rankingBuilder.listRankings(strapi);
  },

  async get(id) {
    return rankingBuilder.getRanking(strapi, id);
  },

  async create(payload) {
    return rankingBuilder.createRanking(strapi, payload);
  },

  async update(id, payload) {
    return rankingBuilder.updateRanking(strapi, id, payload);
  },

  async listProducts(filters) {
    return rankingBuilder.listAvailableProducts(strapi, filters);
  },
});
