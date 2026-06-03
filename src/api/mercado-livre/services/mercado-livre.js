'use strict';

const { searchProducts } = require('../../../services/marketplaces/mercado-livre/search');
const { importProducts } = require('../../../services/marketplaces/mercado-livre/import-products');

module.exports = () => ({
  async search(payload) {
    return searchProducts(payload);
  },

  async import(payload) {
    return importProducts(strapi, payload);
  },
});
