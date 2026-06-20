'use strict';

const { rankProductsForIntent } = require('./intent-aware-ranking');

const TOP_LIMIT = 10;

const round = (value, decimals = 2) => {
  const multiplier = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
};

const getProductIdentity = (product, index) => {
  return String(
    product?.id ||
      product?.productId ||
      product?.marketplaceProductId ||
      product?.sourceId ||
      product?.name ||
      product?.title ||
      `product-${index + 1}`
  );
};

const summarizeProduct = (rankedItem) => {
  const product = rankedItem.product;

  return {
    position: rankedItem.editorialPosition,
    originalPosition: rankedItem.originalPosition,
    productId: product.id || product.productId || null,
    marketplaceProductId: product.marketplaceProductId || null,
    name: product.name || product.title || null,
    price: product.price === null || product.price === undefined ? null : Number(product.price),
    oldPrice: product.oldPrice === null || product.oldPrice === undefined
      ? null
      : Number(product.oldPrice),
    rating: product.rating === null || product.rating === undefined ? null : Number(product.rating),
    reviewCount: product.reviewCount === null || product.reviewCount === undefined
      ? null
      : Number(product.reviewCount),
    simulatorScore: rankedItem.intentScore,
    scoreBreakdown: rankedItem.scoreBreakdown,
  };
};

const simulateIntentRanking = ({ intent, keyword = '', products = [], intentModifier } = {}) => {
  const original = rankProductsForIntent({
    intent: 'best',
    keyword,
    products,
  }).slice(0, TOP_LIMIT);
  const simulated = rankProductsForIntent({
    intent,
    keyword,
    products,
    intentModifier,
  }).slice(0, TOP_LIMIT);
  const comparisonLength = Math.max(original.length, simulated.length);
  let changedPositions = 0;

  for (let index = 0; index < comparisonLength; index += 1) {
    if (
      getProductIdentity(original[index]?.product, index) !==
      getProductIdentity(simulated[index]?.product, index)
    ) {
      changedPositions += 1;
    }
  }

  const originalIdentities = new Set(
    original.map((item, index) => getProductIdentity(item.product, index))
  );
  const simulatedIdentities = new Set(
    simulated.map((item, index) => getProductIdentity(item.product, index))
  );
  const intersectionSize = [...originalIdentities].filter((identity) =>
    simulatedIdentities.has(identity)
  ).length;
  const unionSize = new Set([...originalIdentities, ...simulatedIdentities]).size;

  return {
    intent: simulated[0]?.strategy || 'best',
    keyword,
    totalProducts: products.length,
    originalTop10: original.map(summarizeProduct),
    simulatedTop10: simulated.map(summarizeProduct),
    changedPositions,
    similarityScore: unionSize ? round(intersectionSize / unionSize) : 1,
  };
};

module.exports = {
  simulateIntentRanking,
};
