'use strict';

require('dotenv').config();

const { createStrapi } = require('@strapi/strapi');
const {
  syncMarketplaceRankingByTerm,
} = require('../src/services/marketplaces/mercado-livre/ranking-term-sync');

const DEFAULT_SITE_ID = 'MLB';
const DEFAULT_TERM = 'furadeira';

const uid = {
  marketplaceRanking: 'api::marketplace-ranking.marketplace-ranking',
  marketplaceRankingEntry: 'api::marketplace-ranking-entry.marketplace-ranking-entry',
  product: 'api::product.product',
  affiliateLink: 'api::affiliate-link.affiliate-link',
  ranking: 'api::ranking.ranking',
  rankingItem: 'api::ranking-item.ranking-item',
  page: 'api::page.page',
  seo: 'api::seo.seo',
  faq: 'api::faq.faq',
  aiGenerationLog: 'api::ai-generation-log.ai-generation-log',
};

const getTerm = () => {
  const term = process.argv.slice(2).join(' ').trim();

  return term || DEFAULT_TERM;
};

const countRecords = (strapi, modelUid) => {
  return strapi.db.query(modelUid).count();
};

const countModels = async (strapi) => ({
  marketplaceRankings: await countRecords(strapi, uid.marketplaceRanking),
  marketplaceRankingEntries: await countRecords(strapi, uid.marketplaceRankingEntry),
  products: await countRecords(strapi, uid.product),
  affiliateLinks: await countRecords(strapi, uid.affiliateLink),
  rankings: await countRecords(strapi, uid.ranking),
  rankingItems: await countRecords(strapi, uid.rankingItem),
  pages: await countRecords(strapi, uid.page),
  seos: await countRecords(strapi, uid.seo),
  faqs: await countRecords(strapi, uid.faq),
  aiGenerationLogs: await countRecords(strapi, uid.aiGenerationLog),
});

const compareProtectedCounts = (before, after) => ({
  pagesUnchanged: before.pages === after.pages,
  seosUnchanged: before.seos === after.seos,
  faqsUnchanged: before.faqs === after.faqs,
  aiGenerationLogsUnchanged: before.aiGenerationLogs === after.aiGenerationLogs,
});

const main = async () => {
  const term = getTerm();
  const siteId = process.env.MERCADO_LIVRE_SITE_ID || DEFAULT_SITE_ID;
  const app = await createStrapi().load();

  try {
    const beforeCounts = await countModels(app);
    const result = await syncMarketplaceRankingByTerm(app, {
      term,
      siteId,
    });
    const afterCounts = await countModels(app);

    console.log(
      JSON.stringify(
        {
          ...result,
          modelCounts: {
            before: beforeCounts,
            after: afterCounts,
            protectedUnchanged: compareProtectedCounts(beforeCounts, afterCounts),
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
