'use strict';

require('dotenv').config();

const { createStrapi } = require('@strapi/strapi');
const {
  syncMarketplaceRankingEditorial,
} = require('../src/services/marketplaces/mercado-livre/ranking-editorial-sync');

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
  seo: 'api::seo.seo',
  faq: 'api::faq.faq',
  aiGenerationLog: 'api::ai-generation-log.ai-generation-log',
};

const getArgValue = (index, fallback) => {
  const value = process.argv[index];

  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const countRecords = async (strapi, modelUid) => {
  return strapi.db.query(modelUid).count();
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
    seos: await countRecords(strapi, uid.seo),
    faqs: await countRecords(strapi, uid.faq),
    aiGenerationLogs: await countRecords(strapi, uid.aiGenerationLog),
  };
};

const summarizeSkippedEntries = (skippedEntries) => {
  return skippedEntries.map((entry) => ({
    entryId: entry.entryId,
    sourceId: entry.sourceId,
    position: entry.position,
    productId: entry.productId || null,
    reason: entry.reason,
  }));
};

const summarizeProducts = (products) => {
  return products.map((product) => ({
    rankingItemId: product.rankingItemId,
    rankingItemAction: product.rankingItemAction,
    productId: product.productId,
    marketplaceProductId: product.marketplaceProductId,
    position: product.position,
    affiliateLinkId: product.affiliateLinkId,
    sourceEntryId: product.sourceEntryId,
  }));
};

const compareCounts = (before, after) => ({
  productUnchanged: before.products === after.products,
  affiliateLinkUnchanged: before.affiliateLinks === after.affiliateLinks,
  pageUnchanged: before.pages === after.pages,
  seoUnchanged: before.seos === after.seos,
  faqUnchanged: before.faqs === after.faqs,
  aiGenerationLogUnchanged: before.aiGenerationLogs === after.aiGenerationLogs,
});

const main = async () => {
  const categoryId = getArgValue(2, DEFAULT_CATEGORY_ID);
  const siteId = getArgValue(3, DEFAULT_SITE_ID);
  const app = await createStrapi().load();

  try {
    const beforeCounts = await countModels(app);
    const result = await syncMarketplaceRankingEditorial(app, {
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
          rankingId: result.rankingId,
          rankingAction: result.rankingAction,
          totalEntries: result.totalEntries,
          eligibleEntries: result.eligibleEntries,
          createdRankingItems: result.createdRankingItems,
          updatedRankingItems: result.updatedRankingItems,
          deactivatedRankingItems: result.deactivatedRankingItems,
          skippedEntries: summarizeSkippedEntries(result.skippedEntries),
          products: summarizeProducts(result.products),
          modelCounts: {
            before: beforeCounts,
            after: afterCounts,
            unchanged: compareCounts(beforeCounts, afterCounts),
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
