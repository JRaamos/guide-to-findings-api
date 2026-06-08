'use strict';

require('dotenv').config();

const { createStrapi } = require('@strapi/strapi');
const {
  buildRankingContext,
} = require('../src/services/ai-generator/build-ranking-context');

const DEFAULT_RANKING_ID = 11;

const getRankingId = () => {
  const value = Number(process.argv[2] || DEFAULT_RANKING_ID);

  return Number.isInteger(value) && value > 0 ? value : DEFAULT_RANKING_ID;
};

const summarizeProduct = (item) => ({
  rankingItemId: item.id,
  position: item.position,
  marketplacePosition: item.marketplaceEntry?.position || null,
  title: item.title,
  productId: item.product?.id || null,
  marketplaceProductId: item.product?.marketplaceProductId || null,
  productName: item.product?.name || null,
  price: item.product?.price ?? null,
  currency: item.product?.currency || null,
  imageUrl: item.product?.imageUrl || null,
  marketplaceUrl: item.product?.marketplaceUrl || null,
  hasAffiliateLink: Boolean(item.affiliateLink?.id && item.affiliateLink?.hasAffiliateUrl),
  sourceId: item.marketplaceEntry?.sourceId || null,
  sourceType: item.marketplaceEntry?.sourceType || null,
});

const getMissingFields = (products) => {
  const missing = {
    price: [],
    imageUrl: [],
    affiliateLink: [],
    marketplaceProductId: [],
  };

  for (const item of products) {
    const label = item.product?.marketplaceProductId || item.product?.name || `item:${item.id}`;

    if (item.product?.price === null || item.product?.price === undefined) {
      missing.price.push(label);
    }

    if (!item.product?.imageUrl) {
      missing.imageUrl.push(label);
    }

    if (!item.affiliateLink?.id || !item.affiliateLink?.hasAffiliateUrl) {
      missing.affiliateLink.push(label);
    }

    if (!item.product?.marketplaceProductId) {
      missing.marketplaceProductId.push(label);
    }
  }

  return missing;
};

const main = async () => {
  const rankingId = getRankingId();
  const app = await createStrapi().load();

  try {
    const context = await buildRankingContext(app, rankingId);
    const products = Array.isArray(context.products) ? context.products : [];
    const positions = products.map((item) => item.position);

    console.log(
      JSON.stringify(
        {
          ranking: context.ranking,
          source: context.source,
          category: context.category,
          subCategory: context.subCategory,
          productCount: products.length,
          positions,
          ordered: positions.every((position, index) => index === 0 || position >= positions[index - 1]),
          missingFields: getMissingFields(products),
          products: products.map(summarizeProduct),
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
