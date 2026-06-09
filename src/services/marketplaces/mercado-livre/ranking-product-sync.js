'use strict';

const {
  importNormalizedMarketplaceProducts,
} = require('./import-products');

const uid = {
  marketplaceRanking: 'api::marketplace-ranking.marketplace-ranking',
  marketplaceRankingEntry: 'api::marketplace-ranking-entry.marketplace-ranking-entry',
  category: 'api::category.category',
  subCategory: 'api::sub-category.sub-category',
};

const MARKETPLACE = 'mercado-livre';
const DEFAULT_SITE_ID = 'MLB';

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const valueExists = (value) => {
  return value !== null && value !== undefined && value !== '';
};

const findMarketplaceRanking = (strapi, { marketplaceRankingId, siteId, categoryId }) => {
  if (marketplaceRankingId) {
    return query(strapi, uid.marketplaceRanking).findOne({
      where: {
        id: marketplaceRankingId,
      },
      populate: ['category', 'subCategory'],
    });
  }

  return query(strapi, uid.marketplaceRanking).findOne({
    where: {
      marketplace: MARKETPLACE,
      siteId,
      externalCategoryId: categoryId,
    },
    populate: ['category', 'subCategory'],
  });
};

const findMarketplaceRankingEntries = (strapi, marketplaceRankingId) => {
  return query(strapi, uid.marketplaceRankingEntry).findMany({
    where: {
      marketplaceRanking: {
        id: marketplaceRankingId,
      },
    },
    orderBy: {
      position: 'asc',
    },
    limit: 1000,
  });
};

const isPublishableEntry = (entry) => {
  return entry.status === 'active' || entry.enrichmentStatus === 'publishable';
};

const getMissingPublishableFields = (entry) => {
  const checks = {
    title: entry.titleSnapshot,
    imageUrl: entry.imageUrlSnapshot,
    price: entry.priceSnapshot,
    permalink: entry.permalinkSnapshot,
    categoryId: entry.categoryIdSnapshot,
    position: entry.position,
  };

  return Object.entries(checks)
    .filter(([, value]) => !valueExists(value))
    .map(([field]) => field);
};

const mapEntryToProduct = (entry) => ({
  sourceEntryId: entry.id,
  marketplaceProductId: entry.marketplaceProductId || entry.marketplaceItemId || entry.sourceId,
  title: entry.titleSnapshot,
  permalink: entry.permalinkSnapshot,
  thumbnail: entry.imageUrlSnapshot,
  price: entry.priceSnapshot ?? null,
  originalPrice: entry.oldPriceSnapshot ?? null,
  currency: entry.currencySnapshot || 'BRL',
  soldQuantity: entry.soldQuantitySnapshot ?? null,
  categoryId: entry.categoryIdSnapshot,
  brand: entry.brandSnapshot || null,
  model: entry.modelSnapshot || null,
  rating: entry.ratingSnapshot ?? null,
  reviewCount: entry.reviewCountSnapshot ?? null,
  attributes: {
    marketplaceRankingEntryId: entry.id,
    marketplaceRankingSourceId: entry.sourceId,
    marketplaceRankingSourceType: entry.sourceType,
    marketplaceRankingPosition: entry.position,
  },
});

const getOptionalRelation = async (strapi, modelUid, id, label) => {
  if (!id) {
    return null;
  }

  const relation = await query(strapi, modelUid).findOne({
    where: {
      id,
    },
  });

  if (!relation) {
    throw new Error(`${label} not found`);
  }

  return relation;
};

const buildImportPayload = (entries) => {
  const products = [];
  const skipped = [];

  for (const entry of entries) {
    if (!isPublishableEntry(entry)) {
      skipped.push({
        entryId: entry.id,
        sourceId: entry.sourceId,
        position: entry.position,
        reason: 'entry is not publishable',
        status: entry.status,
        enrichmentStatus: entry.enrichmentStatus,
      });
      continue;
    }

    const missingFields = getMissingPublishableFields(entry);

    if (missingFields.length) {
      skipped.push({
        entryId: entry.id,
        sourceId: entry.sourceId,
        position: entry.position,
        reason: 'missing required publishable fields',
        missingFields,
        status: entry.status,
        enrichmentStatus: entry.enrichmentStatus,
      });
      continue;
    }

    products.push(mapEntryToProduct(entry));
  }

  return {
    products,
    skipped,
  };
};

const linkEntriesToProducts = async (strapi, importedProducts) => {
  let linkedEntries = 0;
  const errors = [];

  for (const product of importedProducts) {
    if (!product.sourceEntryId || !product.id) {
      continue;
    }

    try {
      await query(strapi, uid.marketplaceRankingEntry).update({
        where: {
          id: product.sourceEntryId,
        },
        data: {
          product: product.id,
        },
      });
      linkedEntries += 1;
    } catch (error) {
      errors.push({
        entryId: product.sourceEntryId,
        productId: product.id,
        message: error.message,
      });
    }
  }

  return {
    linkedEntries,
    errors,
  };
};

const syncMarketplaceRankingProducts = async (
  strapi,
  {
    siteId = DEFAULT_SITE_ID,
    categoryId,
    marketplaceRankingId,
    localCategoryId,
    localSubCategoryId,
  } = {}
) => {
  if (!strapi?.db) {
    throw new Error('strapi instance is required');
  }

  if (!marketplaceRankingId && (!categoryId || typeof categoryId !== 'string')) {
    throw new Error('categoryId is required when marketplaceRankingId is not provided');
  }

  const marketplaceRanking = await findMarketplaceRanking(strapi, {
    marketplaceRankingId,
    siteId,
    categoryId,
  });

  if (!marketplaceRanking) {
    throw new Error('MarketplaceRanking not found');
  }

  const entries = await findMarketplaceRankingEntries(strapi, marketplaceRanking.id);
  const { products, skipped } = buildImportPayload(entries);
  const localCategory = await getOptionalRelation(
    strapi,
    uid.category,
    localCategoryId || marketplaceRanking.category?.id,
    'localCategoryId'
  );
  const localSubCategory = await getOptionalRelation(
    strapi,
    uid.subCategory,
    localSubCategoryId || marketplaceRanking.subCategory?.id,
    'localSubCategoryId'
  );
  const importResult = products.length
    ? await importNormalizedMarketplaceProducts(strapi, products, {
        category: localCategory,
        subCategory: localSubCategory,
      })
    : {
        success: true,
        imported: 0,
        skipped: 0,
        products: [],
        skippedProducts: [],
        productsCreated: 0,
        productsUpdated: 0,
        affiliateLinksCreated: 0,
        affiliateLinksUpdated: 0,
      };
  const linkResult = await linkEntriesToProducts(strapi, importResult.products);

  return {
    success: true,
    marketplaceRankingId: marketplaceRanking.id,
    siteId: marketplaceRanking.siteId,
    categoryId: marketplaceRanking.externalCategoryId,
    totalEntries: entries.length,
    publishableEntries: products.length,
    importedProducts: importResult.imported,
    productsCreated: importResult.productsCreated,
    productsUpdated: importResult.productsUpdated,
    affiliateLinksCreated: importResult.affiliateLinksCreated,
    affiliateLinksUpdated: importResult.affiliateLinksUpdated,
    linkedEntries: linkResult.linkedEntries,
    skippedEntries: [...skipped, ...importResult.skippedProducts],
    errors: linkResult.errors,
    products: importResult.products,
  };
};

module.exports = {
  syncMarketplaceRankingProducts,
};
