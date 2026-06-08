'use strict';

require('dotenv').config();

const {
  getMarketplaceRankingProducts,
} = require('../src/services/marketplaces/mercado-livre/ranking-enrichment');

const DEFAULT_SITE_ID = 'MLB';
const DEFAULT_CATEGORY_ID = 'MLB188785';
const DEFAULT_LIMIT = 20;

const getArgValue = (index, fallback) => {
  const value = process.argv[index];

  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const countMissingFields = (items) => {
  return items.reduce((acc, item) => {
    for (const field of item.missingFields || []) {
      acc[field] = (acc[field] || 0) + 1;
    }

    return acc;
  }, {});
};

const summarizeProduct = (product) => ({
  position: product.position,
  sourceId: product.sourceId,
  sourceType: product.sourceType,
  marketplaceProductId: product.marketplaceProductId,
  marketplaceItemId: product.marketplaceItemId,
  title: product.title,
  price: product.price,
  oldPrice: product.oldPrice,
  currency: product.currency,
  imageUrl: product.imageUrl,
  permalink: product.permalink,
  categoryId: product.categoryId,
  rating: product.rating,
  reviewCount: product.reviewCount,
  brand: product.brand,
  model: product.model,
  missingFields: product.missingFields,
});

const summarizeSkipped = (item) => ({
  position: item.position,
  sourceId: item.sourceId,
  sourceType: item.sourceType,
  enrichmentStatus: item.enrichmentStatus,
  missingFields: item.missingFields,
  errors: (item.errors || []).map((error) => ({
    label: error.label,
    status: error.status || null,
    message: error.message,
  })),
});

const buildDiscoverySummary = (result) => {
  const skippedIds = result.skipped.map((item) => item.sourceId).filter(Boolean);

  return {
    success: result.success,
    siteId: result.siteId,
    categoryId: result.categoryId,
    source: result.source,
    totals: {
      totalHighlights: result.totalHighlights,
      totalEnriched: result.totalEnriched,
      totalPublishable: result.totalPublishable,
      totalSkipped: result.skipped.length,
      publishableRate: result.publishableRate,
    },
    publishableProducts: result.products.map(summarizeProduct),
    skippedIds,
    skipped: result.skipped.map(summarizeSkipped),
    missingFields: {
      publishable: countMissingFields(result.products),
      skipped: countMissingFields(result.skipped),
    },
    errors: result.errors.map((error) => ({
      position: error.position,
      sourceId: error.sourceId,
      sourceType: error.sourceType,
      label: error.label,
      status: error.status || null,
      message: error.message,
    })),
    viability: {
      viableForTop10: result.totalPublishable >= 10,
      recommendation:
        result.totalPublishable >= 10
          ? 'Viable for the future persistent sync: enough publishable products for a top10 ranking.'
          : 'Not yet viable for persistent sync: improve enrichment fallbacks before creating records.',
    },
  };
};

const main = async () => {
  const categoryId = getArgValue(2, DEFAULT_CATEGORY_ID);
  const siteId = getArgValue(3, DEFAULT_SITE_ID);
  const limit = Number(getArgValue(4, String(DEFAULT_LIMIT)));

  try {
    const result = await getMarketplaceRankingProducts({
      siteId,
      categoryId,
      limit,
    });

    console.log(JSON.stringify(buildDiscoverySummary(result), null, 2));
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          success: false,
          siteId,
          categoryId,
          source: 'highlights',
          error: error.message,
          viability: {
            viableForTop10: false,
            recommendation:
              'Discovery failed before enrichment completed. Fix endpoint access before planning persistence.',
          },
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }
};

main();
