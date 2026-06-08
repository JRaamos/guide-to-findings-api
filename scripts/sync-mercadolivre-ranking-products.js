'use strict';

require('dotenv').config();

const { createStrapi } = require('@strapi/strapi');
const {
  syncMarketplaceRankingProducts,
} = require('../src/services/marketplaces/mercado-livre/ranking-product-sync');

const DEFAULT_SITE_ID = 'MLB';
const DEFAULT_CATEGORY_ID = 'MLB188785';

const uid = {
  product: 'api::product.product',
  affiliateLink: 'api::affiliate-link.affiliate-link',
  marketplaceRanking: 'api::marketplace-ranking.marketplace-ranking',
  marketplaceRankingEntry: 'api::marketplace-ranking-entry.marketplace-ranking-entry',
  ranking: 'api::ranking.ranking',
  rankingItem: 'api::ranking-item.ranking-item',
  page: 'api::page.page',
};

const getArgValue = (index, fallback) => {
  const value = process.argv[index];

  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const countRecords = async (strapi, modelUid, where = undefined) => {
  return strapi.db.query(modelUid).count({ where });
};

const countModels = async (strapi) => {
  return {
    products: await countRecords(strapi, uid.product),
    affiliateLinks: await countRecords(strapi, uid.affiliateLink),
    marketplaceRankings: await countRecords(strapi, uid.marketplaceRanking),
    marketplaceRankingEntries: await countRecords(strapi, uid.marketplaceRankingEntry),
    rankings: await countRecords(strapi, uid.ranking),
    rankingItems: await countRecords(strapi, uid.rankingItem),
    pages: await countRecords(strapi, uid.page),
  };
};

const summarizeSkippedEntries = (skippedEntries) => {
  return skippedEntries.map((entry) => ({
    entryId: entry.entryId || null,
    sourceId: entry.sourceId || entry.marketplaceProductId || null,
    position: entry.position || null,
    reason: entry.reason,
    missingFields: entry.missingFields || [],
  }));
};

const summarizeProducts = (products) => {
  return products.map((product) => ({
    productId: product.id,
    marketplaceProductId: product.marketplaceProductId,
    name: product.name,
    productAction: product.productAction,
    affiliateLinkId: product.affiliateLinkId,
    affiliateLinkAction: product.affiliateLinkAction,
    sourceEntryId: product.sourceEntryId,
  }));
};

const hasUnchangedEditorialModels = (before, after) => {
  return (
    before.rankings === after.rankings &&
    before.rankingItems === after.rankingItems &&
    before.pages === after.pages
  );
};

const main = async () => {
  const categoryId = getArgValue(2, DEFAULT_CATEGORY_ID);
  const siteId = getArgValue(3, DEFAULT_SITE_ID);
  const app = await createStrapi().load();

  try {
    const beforeCounts = await countModels(app);
    const result = await syncMarketplaceRankingProducts(app, {
      siteId,
      categoryId,
    });
    const afterCounts = await countModels(app);

    console.log(
      JSON.stringify(
        {
          success: result.success,
          siteId,
          categoryId,
          marketplaceRankingId: result.marketplaceRankingId,
          totalEntries: result.totalEntries,
          publishableEntries: result.publishableEntries,
          importedProducts: result.importedProducts,
          productsCreated: result.productsCreated,
          productsUpdated: result.productsUpdated,
          affiliateLinksCreated: result.affiliateLinksCreated,
          affiliateLinksUpdated: result.affiliateLinksUpdated,
          linkedEntries: result.linkedEntries,
          skippedEntries: summarizeSkippedEntries(result.skippedEntries),
          errors: result.errors,
          products: summarizeProducts(result.products),
          modelCounts: {
            before: beforeCounts,
            after: afterCounts,
            editorialUnchanged: hasUnchangedEditorialModels(beforeCounts, afterCounts),
            marketplaceRankingEntriesUnchanged:
              beforeCounts.marketplaceRankingEntries === afterCounts.marketplaceRankingEntries,
          },
        },
        null,
        2
      )
    );
  } finally {
    await app.destroy();
  }
};

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: error.message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
