'use strict';

const client = require('./client');
const { normalizeProduct } = require('./normalize-product');

const DEFAULT_SITE_ID = 'MLB';
const DEFAULT_LIMIT = 20;
const CATALOG_ITEM_LIMIT = 3;
const SOURCE = 'highlights';
const REQUIRED_FIELDS = ['title', 'imageUrl', 'price', 'permalink', 'categoryId', 'position'];
const OPTIONAL_FIELDS = ['brand', 'model', 'rating', 'reviewCount', 'soldQuantity'];

const valueExists = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== null && value !== undefined && value !== '';
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const summarizeErrorData = (data) => {
  if (!data) {
    return null;
  }

  if (typeof data.raw === 'string') {
    return {
      raw: data.raw.slice(0, 180),
    };
  }

  return data;
};

const createErrorSummary = (error) => ({
  status: error.status || null,
  message: error.message,
  data: summarizeErrorData(error.data),
});

const buildCatalogProductUrl = (siteId, productId) => {
  if (siteId === 'MLB') {
    return `https://www.mercadolivre.com.br/p/${productId}`;
  }

  return `https://www.mercadolibre.com/p/${productId}`;
};

const sanitizeLimit = (limit) => {
  const value = Number(limit);

  if (!Number.isInteger(value) || value <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(value, DEFAULT_LIMIT);
};

const getHighlightItems = (payload) => {
  if (Array.isArray(payload?.content)) {
    return payload.content;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
};

const getExternalId = (highlightItem) => {
  return (
    highlightItem?.id ||
    highlightItem?.item_id ||
    highlightItem?.product_id ||
    highlightItem?.itemId ||
    highlightItem?.productId ||
    null
  );
};

const getExternalType = (highlightItem) => {
  const type = String(highlightItem?.type || '').toLowerCase();

  if (type.includes('product')) {
    return 'product';
  }

  if (type.includes('item')) {
    return 'item';
  }

  return 'unknown';
};

const getPosition = (highlightItem, index) => {
  const position = Number(highlightItem?.position || highlightItem?.rank || index + 1);

  return Number.isInteger(position) && position > 0 ? position : index + 1;
};

const createEmptyResult = (highlightItem, index) => {
  const position = getPosition(highlightItem, index);
  const missingRequiredFields = REQUIRED_FIELDS.filter(
    (field) => field !== 'position' || !valueExists(position)
  );

  return {
    position,
    sourceId: getExternalId(highlightItem),
    sourceType: getExternalType(highlightItem),
    enrichmentStatus: 'failed',
    publishable: false,
    missingRequiredFields,
    missingOptionalFields: [...OPTIONAL_FIELDS],
    endpoints: [],
    errors: [],
    normalizedProduct: null,
  };
};

const hasPrice = (item) => Number.isFinite(Number(item?.price));

const chooseRelatedItem = (items = []) => {
  return items.find((item) => item?.item_id && hasPrice(item)) || items.find((item) => item?.item_id) || null;
};

const fetchJson = async (path, params, label, result) => {
  try {
    const data = await client.get(path, params);

    result.endpoints.push({
      label,
      path,
      status: 200,
      fields: isPlainObject(data) ? Object.keys(data).sort() : [],
    });

    return {
      ok: true,
      data,
    };
  } catch (error) {
    const errorSummary = createErrorSummary(error);

    result.endpoints.push({
      label,
      path,
      status: errorSummary.status,
      error: errorSummary.message,
    });
    result.errors.push({
      label,
      path,
      ...errorSummary,
    });

    return {
      ok: false,
      error: errorSummary,
    };
  }
};

const fetchItemFromMultiget = async (itemId, result) => {
  const response = await fetchJson('/items', { ids: itemId }, 'item-multiget', result);

  if (!response.ok || !Array.isArray(response.data)) {
    return null;
  }

  const entry = response.data.find((item) => item?.body?.id === itemId) || response.data[0];

  if (!entry || entry.code !== 200) {
    result.errors.push({
      label: 'item-multiget-body',
      path: '/items',
      status: entry?.code || null,
      message: entry?.body?.message || 'Item multiget did not return a successful body',
      data: summarizeErrorData(entry?.body),
    });

    return null;
  }

  return entry.body || null;
};

const fetchCatalogProduct = async (productId, result) => {
  const response = await fetchJson(`/products/${productId}`, undefined, 'catalog-product', result);

  return response.ok ? response.data : null;
};

const fetchCatalogItems = async (productId, result) => {
  const response = await fetchJson(
    `/products/${productId}/items`,
    { limit: CATALOG_ITEM_LIMIT },
    'catalog-product-items',
    result
  );

  if (!response.ok || !Array.isArray(response.data?.results)) {
    return [];
  }

  return response.data.results;
};

const fetchReviews = async (itemId, result) => {
  if (!itemId) {
    return null;
  }

  const response = await fetchJson(`/reviews/item/${itemId}`, { limit: 1 }, 'item-reviews', result);

  if (!response.ok) {
    return null;
  }

  return {
    ratingAverage: response.data?.rating_average ?? null,
    total: response.data?.paging?.total ?? null,
  };
};

const mergeCatalogProductWithItem = ({ catalogProduct, relatedItem, sourceId, siteId }) => {
  return {
    ...catalogProduct,
    marketplaceProductId: relatedItem?.item_id || catalogProduct?.id || sourceId,
    title: catalogProduct?.title || catalogProduct?.name || relatedItem?.title || null,
    permalink:
      relatedItem?.permalink ||
      catalogProduct?.permalink ||
      buildCatalogProductUrl(siteId, catalogProduct?.id || sourceId),
    thumbnail: catalogProduct?.thumbnail || catalogProduct?.pictures?.[0]?.url || relatedItem?.thumbnail || null,
    price: relatedItem?.price ?? catalogProduct?.price ?? null,
    original_price: relatedItem?.original_price ?? catalogProduct?.original_price ?? null,
    currency_id: relatedItem?.currency_id || catalogProduct?.currency_id || 'BRL',
    condition: relatedItem?.condition || catalogProduct?.condition || null,
    available_quantity: relatedItem?.available_quantity ?? catalogProduct?.available_quantity ?? null,
    sold_quantity: relatedItem?.sold_quantity ?? catalogProduct?.sold_quantity ?? null,
    category_id: relatedItem?.category_id || catalogProduct?.category_id || null,
    seller_id: relatedItem?.seller_id || catalogProduct?.seller_id || null,
  };
};

const mergeItemPayload = (itemPayload) => {
  return {
    ...itemPayload,
    marketplaceProductId: itemPayload?.id || itemPayload?.item_id || null,
    title: itemPayload?.title || itemPayload?.name || null,
    permalink: itemPayload?.permalink || itemPayload?.url || null,
    thumbnail: itemPayload?.thumbnail || itemPayload?.pictures?.[0]?.url || null,
    original_price: itemPayload?.original_price ?? null,
    currency_id: itemPayload?.currency_id || 'BRL',
    category_id: itemPayload?.category_id || null,
    seller_id: itemPayload?.seller_id || itemPayload?.seller?.id || null,
  };
};

const applyReviews = (productPayload, reviews) => {
  if (!reviews) {
    return productPayload;
  }

  return {
    ...productPayload,
    reviews: {
      ...(productPayload.reviews || {}),
      rating_average: reviews.ratingAverage ?? productPayload.reviews?.rating_average ?? null,
      total: reviews.total ?? productPayload.reviews?.total ?? null,
    },
  };
};

const buildProductPayload = ({ result, normalizedProduct }) => ({
  position: result.position,
  sourceId: result.sourceId,
  sourceType: result.sourceType,
  enrichmentStatus: result.enrichmentStatus,
  marketplaceProductId: normalizedProduct.marketplaceProductId,
  marketplaceItemId: result.resolvedItemId || normalizedProduct.marketplaceProductId,
  title: normalizedProduct.title,
  brand: normalizedProduct.brand,
  model: normalizedProduct.model,
  price: normalizedProduct.price,
  oldPrice: normalizedProduct.originalPrice,
  currency: normalizedProduct.currency || 'BRL',
  imageUrl: normalizedProduct.thumbnail,
  permalink: normalizedProduct.permalink,
  categoryId: normalizedProduct.categoryId,
  rating: normalizedProduct.rating,
  reviewCount: normalizedProduct.reviewCount,
  soldQuantity: normalizedProduct.soldQuantity,
  sellerId: normalizedProduct.sellerId,
  condition: normalizedProduct.condition,
  availableQuantity: normalizedProduct.availableQuantity,
  attributes: normalizedProduct.attributes || {},
  missingFields: [...result.missingRequiredFields, ...result.missingOptionalFields],
  errors: result.errors,
});

const getFieldPresence = (result, product) => ({
  title: valueExists(product?.title),
  imageUrl: valueExists(product?.thumbnail),
  price: valueExists(product?.price),
  permalink: valueExists(product?.permalink),
  categoryId: valueExists(product?.categoryId),
  position: valueExists(result?.position),
  brand: valueExists(product?.brand),
  model: valueExists(product?.model),
  rating: valueExists(product?.rating),
  reviewCount: valueExists(product?.reviewCount),
  soldQuantity: valueExists(product?.soldQuantity),
});

const listMissingFields = (fieldPresence, fields) => fields.filter((field) => !fieldPresence[field]);

const finalizeResult = (result, normalizedProduct) => {
  const fieldPresence = getFieldPresence(result, normalizedProduct);
  const missingRequiredFields = listMissingFields(fieldPresence, REQUIRED_FIELDS);
  const missingOptionalFields = listMissingFields(fieldPresence, OPTIONAL_FIELDS);
  const enrichmentStatus = missingRequiredFields.length ? 'partial' : 'publishable';
  const nextResult = {
    ...result,
    enrichmentStatus,
    publishable: missingRequiredFields.length === 0,
    fieldPresence,
    missingRequiredFields,
    missingOptionalFields,
    normalizedProduct,
  };

  return {
    ...nextResult,
    product: buildProductPayload({
      result: nextResult,
      normalizedProduct,
    }),
  };
};

const enrichProductHighlight = async ({ result, siteId }) => {
  const productId = result.sourceId;
  const catalogProduct = await fetchCatalogProduct(productId, result);

  if (!catalogProduct) {
    return result;
  }

  const relatedItems = await fetchCatalogItems(productId, result);
  const relatedItem = chooseRelatedItem(relatedItems);
  const reviews = await fetchReviews(relatedItem?.item_id, result);
  const mergedPayload = applyReviews(
    mergeCatalogProductWithItem({
      catalogProduct,
      relatedItem,
      sourceId: productId,
      siteId,
    }),
    reviews
  );
  const normalizedProduct = normalizeProduct(mergedPayload);

  return finalizeResult(
    {
      ...result,
      resolvedType: relatedItem?.item_id ? 'product-with-related-item' : 'product-only',
      resolvedProductId: catalogProduct.id || productId,
      resolvedItemId: relatedItem?.item_id || null,
    },
    normalizedProduct
  );
};

const enrichItemHighlight = async ({ result, siteId }) => {
  const itemId = result.sourceId;
  const itemDirect = await fetchJson(`/items/${itemId}`, undefined, 'item-direct', result);
  const itemPayload = itemDirect.ok ? itemDirect.data : await fetchItemFromMultiget(itemId, result);

  if (!itemPayload) {
    return result;
  }

  let catalogProduct = null;

  if (itemPayload.catalog_product_id) {
    catalogProduct = await fetchCatalogProduct(itemPayload.catalog_product_id, result);
  }

  const reviews = await fetchReviews(itemPayload.id || itemId, result);
  const mergedPayload = applyReviews(
    catalogProduct
      ? mergeCatalogProductWithItem({
          catalogProduct,
          relatedItem: {
            ...itemPayload,
            item_id: itemPayload.id || itemId,
          },
          sourceId: itemId,
          siteId,
        })
      : mergeItemPayload(itemPayload),
    reviews
  );
  const normalizedProduct = normalizeProduct(mergedPayload);

  return finalizeResult(
    {
      ...result,
      resolvedType: catalogProduct ? 'item-with-catalog-product' : 'item-only',
      resolvedProductId: catalogProduct?.id || itemPayload.catalog_product_id || null,
      resolvedItemId: itemPayload.id || itemId,
    },
    normalizedProduct
  );
};

const enrichHighlightItem = async ({ highlightItem, index, siteId }) => {
  const result = createEmptyResult(highlightItem, index);

  if (!result.sourceId) {
    result.errors.push({
      label: 'highlight',
      message: 'Highlight item has no id',
    });

    return result;
  }

  if (result.sourceType === 'product') {
    return enrichProductHighlight({ result, siteId });
  }

  if (result.sourceType === 'item') {
    return enrichItemHighlight({ result, siteId });
  }

  result.errors.push({
    label: 'highlight',
    message: `Unsupported highlight type: ${result.sourceType}`,
  });

  return result;
};

const buildSkippedPayload = (item) => ({
  position: item.position,
  sourceId: item.sourceId,
  sourceType: item.sourceType,
  enrichmentStatus: item.enrichmentStatus,
  missingFields: [...item.missingRequiredFields, ...item.missingOptionalFields],
  errors: item.errors,
  product: item.product || null,
});

const buildErrorPayload = (item) => {
  return item.errors.map((error) => ({
    position: item.position,
    sourceId: item.sourceId,
    sourceType: item.sourceType,
    ...error,
  }));
};

const getMarketplaceRankingProducts = async ({ siteId = DEFAULT_SITE_ID, categoryId, limit = DEFAULT_LIMIT } = {}) => {
  if (!categoryId || typeof categoryId !== 'string') {
    throw new Error('categoryId is required');
  }

  const safeLimit = sanitizeLimit(limit);
  const highlightsPayload = await client.get(`/highlights/${siteId}/category/${categoryId}`);
  const highlights = getHighlightItems(highlightsPayload).slice(0, safeLimit);
  const enrichedItems = [];

  for (const [index, highlightItem] of highlights.entries()) {
    enrichedItems.push(await enrichHighlightItem({ highlightItem, index, siteId }));
  }

  const products = enrichedItems
    .filter((item) => item.publishable)
    .map((item) => item.product);
  const skipped = enrichedItems
    .filter((item) => !item.publishable)
    .map(buildSkippedPayload);
  const errors = enrichedItems.flatMap(buildErrorPayload);
  const totalEnriched = enrichedItems.filter((item) => item.normalizedProduct).length;
  const publishableRate = highlights.length ? Number((products.length / highlights.length).toFixed(2)) : 0;

  return {
    success: true,
    siteId,
    categoryId,
    source: SOURCE,
    totalHighlights: highlights.length,
    totalEnriched,
    totalPublishable: products.length,
    publishableRate,
    products,
    skipped,
    errors,
  };
};

module.exports = {
  getMarketplaceRankingProducts,
};
