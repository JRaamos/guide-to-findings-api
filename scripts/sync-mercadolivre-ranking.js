'use strict';

require('dotenv').config();

const { createStrapi } = require('@strapi/strapi');
const {
  syncMarketplaceRanking,
} = require('../src/services/marketplaces/mercado-livre/ranking-sync');

const DEFAULT_SITE_ID = 'MLB';
const DEFAULT_CATEGORY_ID = 'MLB188785';

const uid = {
  product: 'api::product.product',
  ranking: 'api::ranking.ranking',
  page: 'api::page.page',
};

const getArgValue = (index, fallback) => {
  const value = process.argv[index];

  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const countRecords = async (strapi, modelUid) => {
  return strapi.db.query(modelUid).count();
};

const countPublicModels = async (strapi) => {
  return {
    products: await countRecords(strapi, uid.product),
    rankings: await countRecords(strapi, uid.ranking),
    pages: await countRecords(strapi, uid.page),
  };
};

const main = async () => {
  const categoryId = getArgValue(2, DEFAULT_CATEGORY_ID);
  const siteId = getArgValue(3, DEFAULT_SITE_ID);
  const app = await createStrapi().load();

  try {
    const beforeCounts = await countPublicModels(app);
    const result = await syncMarketplaceRanking(app, {
      siteId,
      categoryId,
      externalCategoryName: categoryId,
      title: `Mais vendidos Mercado Livre ${categoryId}`,
    });
    const afterCounts = await countPublicModels(app);

    console.log(
      JSON.stringify(
        {
          ...result,
          siteId,
          categoryId,
          publicModelCounts: {
            before: beforeCounts,
            after: afterCounts,
            unchanged:
              beforeCounts.products === afterCounts.products &&
              beforeCounts.rankings === afterCounts.rankings &&
              beforeCounts.pages === afterCounts.pages,
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
