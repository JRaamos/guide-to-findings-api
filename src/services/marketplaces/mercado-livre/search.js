'use strict';

const client = require('./client');
const { normalizeProduct } = require('./normalize-product');

const MAX_LIMIT = 50;
const CATALOG_ITEM_LIMIT = 3;

const sanitizeLimit = (limit) => {
  const value = Number(limit);

  if (!Number.isInteger(value) || value <= 0) {
    return 10;
  }

  return Math.min(value, MAX_LIMIT);
};

const buildCatalogProductUrl = (siteId, productId) => {
  if (siteId === 'MLB') {
    return `https://www.mercadolivre.com.br/p/${productId}`;
  }

  return `https://www.mercadolibre.com/p/${productId}`;
};

const normalizeCatalogDomainId = (categoryId) => {
  if (typeof categoryId !== 'string') {
    return undefined;
  }

  return categoryId.startsWith('MLB-') ? categoryId : undefined;
};

const mergeCatalogProductWithItem = ({ catalogProduct, item, siteId }) => {
  return {
    ...catalogProduct,
    marketplaceProductId: item?.item_id || catalogProduct.id,
    title: catalogProduct.name,
    permalink: catalogProduct.permalink || buildCatalogProductUrl(siteId, catalogProduct.id),
    thumbnail: catalogProduct.thumbnail,
    price: item?.price ?? catalogProduct.price ?? null,
    original_price: item?.original_price ?? catalogProduct.original_price ?? null,
    currency_id: item?.currency_id || catalogProduct.currency_id || 'BRL',
    condition: item?.condition || catalogProduct.condition || null,
    available_quantity: item?.available_quantity ?? catalogProduct.available_quantity ?? null,
    sold_quantity: item?.sold_quantity ?? catalogProduct.sold_quantity ?? null,
    category_id: item?.category_id || catalogProduct.category_id || null,
    seller_id: item?.seller_id || catalogProduct.seller_id || null,
  };
};

const getCatalogItem = async (catalogProductId) => {
  let data;

  try {
    data = await client.get(`/products/${catalogProductId}/items`, {
      limit: CATALOG_ITEM_LIMIT,
    });
  } catch (error) {
    if ([403, 404].includes(error.status)) {
      return null;
    }

    throw error;
  }

  const results = Array.isArray(data.results) ? data.results : [];
  return results.find((item) => item?.item_id) || null;
};

const searchCatalogProducts = async ({ query, limit, categoryId, siteId }) => {
  const data = await client.get('/products/search', {
    status: 'active',
    site_id: siteId,
    q: query,
    limit,
    domain_id: normalizeCatalogDomainId(categoryId),
  });
  const results = Array.isArray(data.results) ? data.results : [];
  const products = [];

  for (const catalogProduct of results) {
    const item = await getCatalogItem(catalogProduct.id);
    const mergedProduct = mergeCatalogProductWithItem({
      catalogProduct,
      item,
      siteId,
    });
    const product = normalizeProduct(mergedProduct);

    if (product.marketplaceProductId && product.permalink) {
      products.push(product);
    }
  }

  return products;
};

const searchProducts = async ({ query, limit, categoryId } = {}, options = {}) => {
  const searchQuery = typeof query === 'string' ? query.trim() : '';

  if (!searchQuery) {
    throw new Error('Search query is required');
  }

  const { siteId } = client.getConfig();
  const safeLimit = sanitizeLimit(limit);
  let source = 'listings';
  let products = [];

  try {
    const data = await client.get(`/sites/${siteId}/search`, {
      q: searchQuery,
      limit: safeLimit,
      category: categoryId,
    });
    const results = Array.isArray(data.results) ? data.results : [];

    products = results.map(normalizeProduct).filter((product) => product.marketplaceProductId);
  } catch (error) {
    if (error.status !== 403) {
      throw error;
    }

    source = 'catalog';
    options.logger?.warn(
      '[Mercado Livre] Listings search returned 403; using catalog products fallback'
    );
    products = await searchCatalogProducts({
      query: searchQuery,
      limit: safeLimit,
      categoryId,
      siteId,
    });
  }

  return {
    success: true,
    query: searchQuery,
    source,
    count: products.length,
    products,
  };
};

module.exports = {
  searchProducts,
};
