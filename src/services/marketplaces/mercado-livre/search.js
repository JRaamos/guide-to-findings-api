'use strict';

const client = require('./client');
const { normalizeProduct } = require('./normalize-product');

const MAX_LIMIT = 50;

const sanitizeLimit = (limit) => {
  const value = Number(limit);

  if (!Number.isInteger(value) || value <= 0) {
    return 10;
  }

  return Math.min(value, MAX_LIMIT);
};

const searchProducts = async ({ query, limit, categoryId } = {}) => {
  const searchQuery = typeof query === 'string' ? query.trim() : '';

  if (!searchQuery) {
    throw new Error('Search query is required');
  }

  const { siteId } = client.getConfig();
  const data = await client.get(`/sites/${siteId}/search`, {
    q: searchQuery,
    limit: sanitizeLimit(limit),
    category: categoryId,
  });
  const results = Array.isArray(data.results) ? data.results : [];
  const products = results.map(normalizeProduct).filter((product) => product.marketplaceProductId);

  return {
    success: true,
    query: searchQuery,
    count: products.length,
    products,
  };
};

module.exports = {
  searchProducts,
};
