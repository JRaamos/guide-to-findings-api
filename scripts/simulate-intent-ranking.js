'use strict';

require('dotenv').config();

const { createStrapi } = require('@strapi/strapi');
const {
  resolveMarketplaceCategory,
} = require('../src/services/marketplaces/mercado-livre/category-resolver');
const {
  simulateIntentRanking,
} = require('../src/services/seo-intelligence/intent-ranking-simulator');

const uid = {
  marketplaceRanking: 'api::marketplace-ranking.marketplace-ranking',
  marketplaceRankingEntry: 'api::marketplace-ranking-entry.marketplace-ranking-entry',
  page: 'api::page.page',
  ranking: 'api::ranking.ranking',
  rankingItem: 'api::ranking-item.ranking-item',
};

const INTENT_NAMES = new Set([
  'best',
  'costbenefit',
  'custo-beneficio',
  'custobeneficio',
  'gamer',
  'gaming',
  'estudar',
  'estudo',
  'study',
  'trabalho',
  'work',
]);

const parseArguments = () => {
  const args = process.argv.slice(2);
  const possibleIntent = args.at(-1) || '';
  const normalizedIntent = possibleIntent.toLowerCase().replace(/_/g, '-');
  const hasIntent = INTENT_NAMES.has(normalizedIntent.replace(/\s/g, ''));
  const termParts = hasIntent ? args.slice(0, -1) : args;

  return {
    term: termParts.join(' ').trim(),
    intent: hasIntent ? possibleIntent : 'best',
  };
};

const countProtectedRecords = async (strapi) => {
  const entries = await Promise.all(
    Object.entries({ pages: uid.page, rankings: uid.ranking, rankingItems: uid.rankingItem }).map(
      async ([key, modelUid]) => [key, await strapi.db.query(modelUid).count()]
    )
  );

  return Object.fromEntries(entries);
};

const findRankingProducts = async (strapi, categoryId) => {
  const marketplaceRanking = await strapi.db.query(uid.marketplaceRanking).findOne({
    where: {
      marketplace: 'mercado-livre',
      siteId: 'MLB',
      externalCategoryId: categoryId,
    },
  });

  if (!marketplaceRanking) {
    throw new Error(
      `MarketplaceRanking not found for ${categoryId}. Run the existing term sync before simulating.`
    );
  }

  const entries = await strapi.db.query(uid.marketplaceRankingEntry).findMany({
    where: {
      marketplaceRanking: {
        id: marketplaceRanking.id,
      },
      status: 'active',
    },
    orderBy: {
      position: 'asc',
    },
    populate: ['product'],
    limit: 100,
  });
  const products = entries
    .filter((entry) => entry.product)
    .map((entry) => ({
      ...entry.product,
      position: entry.position,
      title: entry.product.name || entry.titleSnapshot,
      price: entry.product.price ?? entry.priceSnapshot,
      oldPrice: entry.product.oldPrice ?? entry.oldPriceSnapshot,
      rating: entry.product.rating ?? entry.ratingSnapshot,
      reviewCount: entry.product.reviewCount ?? entry.reviewCountSnapshot,
      brand: entry.product.brand || entry.brandSnapshot,
      model: entry.product.model || entry.modelSnapshot,
      attributes: {
        ...(entry.product.attributes || {}),
        marketplaceRankingEntry: {
          sourceId: entry.sourceId,
          sourceType: entry.sourceType,
          position: entry.position,
        },
      },
    }));

  if (!products.length) {
    throw new Error(`No linked active products found for MarketplaceRanking ${marketplaceRanking.id}`);
  }

  return {
    marketplaceRanking,
    products,
  };
};

const main = async () => {
  const { term, intent } = parseArguments();

  if (!term) {
    throw new Error('Usage: yarn simulate:intent-ranking <term> <intent>');
  }

  const category = await resolveMarketplaceCategory({
    term,
    siteId: 'MLB',
    validateHighlights: false,
  });

  if (!category.success || !category.bestCategory?.id) {
    throw new Error(`Could not resolve a Mercado Livre category for "${term}"`);
  }

  const app = await createStrapi().load();

  try {
    const before = await countProtectedRecords(app);
    const { marketplaceRanking, products } = await findRankingProducts(
      app,
      category.bestCategory.id
    );
    const simulation = simulateIntentRanking({ intent, keyword: term, products });
    const after = await countProtectedRecords(app);

    console.log(
      JSON.stringify(
        {
          success: true,
          readOnly: true,
          term,
          category: {
            id: category.bestCategory.id,
            name: category.bestCategory.name,
          },
          marketplaceRankingId: marketplaceRanking.id,
          protectedCounts: {
            before,
            after,
            unchanged: JSON.stringify(before) === JSON.stringify(after),
          },
          ...simulation,
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
        readOnly: true,
        error: error.message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
