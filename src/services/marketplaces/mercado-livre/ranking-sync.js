'use strict';

const crypto = require('crypto');
const { getMarketplaceRankingProducts } = require('./ranking-enrichment');

const uid = {
  marketplaceRanking: 'api::marketplace-ranking.marketplace-ranking',
  marketplaceRankingEntry: 'api::marketplace-ranking-entry.marketplace-ranking-entry',
};

const MARKETPLACE = 'mercado-livre';
const DEFAULT_SITE_ID = 'MLB';
const DEFAULT_LIMIT = 20;

const now = () => new Date().toISOString();

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const slugify = (value = '') => {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
};

const buildDefaultTitle = ({ externalCategoryName, categoryId }) => {
  return externalCategoryName || `Mais vendidos Mercado Livre ${categoryId}`;
};

const buildDefaultSourceUrl = ({ siteId, categoryId }) => {
  if (siteId === 'MLB') {
    return `https://www.mercadolivre.com.br/mais-vendidos/${categoryId}`;
  }

  return `https://www.mercadolibre.com/mais-vendidos/${categoryId}`;
};

const buildSlug = ({ siteId, categoryId, title }) => {
  return slugify(`${siteId}-${categoryId}-${title}`);
};

const normalizeEnrichmentStatus = (status) => {
  if (status === 'publishable') {
    return 'publishable';
  }

  if (status === 'partial') {
    return 'partial';
  }

  if (status === 'failed') {
    return 'skipped';
  }

  return 'error';
};

const normalizeEntryStatus = (enrichmentStatus) => {
  if (enrichmentStatus === 'publishable') {
    return 'active';
  }

  return 'skipped';
};

const buildCurrentEntries = (enrichmentResult) => {
  const productEntries = enrichmentResult.products.map((product) => ({
    sourceId: product.sourceId,
    sourceType: product.sourceType,
    position: product.position,
    product,
    missingFields: product.missingFields || [],
    errors: product.errors || [],
    enrichmentStatus: 'publishable',
  }));
  const skippedEntries = enrichmentResult.skipped.map((entry) => ({
    sourceId: entry.sourceId,
    sourceType: entry.sourceType,
    position: entry.position,
    product: entry.product || {},
    missingFields: entry.missingFields || [],
    errors: entry.errors || [],
    enrichmentStatus: entry.enrichmentStatus || 'skipped',
  }));

  return [...productEntries, ...skippedEntries].sort((first, second) => first.position - second.position);
};

const buildFingerprintPayload = (entries) => {
  return entries.map((entry) => ({
    position: entry.position,
    sourceId: entry.sourceId,
    sourceType: entry.sourceType,
    marketplaceProductId: entry.product?.marketplaceProductId || null,
    marketplaceItemId: entry.product?.marketplaceItemId || null,
    price: entry.product?.price ?? null,
    oldPrice: entry.product?.oldPrice ?? null,
    title: entry.product?.title || null,
    enrichmentStatus: normalizeEnrichmentStatus(entry.enrichmentStatus),
    missingFields: entry.missingFields || [],
  }));
};

const createFingerprint = (entries) => {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(buildFingerprintPayload(entries)))
    .digest('hex');
};

const getSyncStatus = (enrichmentResult) => {
  if (enrichmentResult.totalPublishable === 0) {
    return 'error';
  }

  if (enrichmentResult.skipped.length > 0) {
    return 'partial';
  }

  return 'success';
};

const getSyncError = (enrichmentResult) => {
  if (!enrichmentResult.errors.length) {
    return null;
  }

  return enrichmentResult.errors.map((error) => ({
    position: error.position,
    sourceId: error.sourceId,
    sourceType: error.sourceType,
    label: error.label,
    status: error.status || null,
    message: error.message,
  }));
};

const findMarketplaceRanking = (strapi, { siteId, categoryId }) => {
  return query(strapi, uid.marketplaceRanking).findOne({
    where: {
      marketplace: MARKETPLACE,
      siteId,
      externalCategoryId: categoryId,
    },
  });
};

const upsertMarketplaceRanking = async (strapi, data, existing) => {
  if (existing) {
    return query(strapi, uid.marketplaceRanking).update({
      where: { id: existing.id },
      data,
    });
  }

  return query(strapi, uid.marketplaceRanking).create({ data });
};

const findExistingEntries = async (strapi, marketplaceRankingId) => {
  const entries = await query(strapi, uid.marketplaceRankingEntry).findMany({
    where: {
      marketplaceRanking: {
        id: marketplaceRankingId,
      },
    },
    limit: 1000,
  });

  return new Map(entries.map((entry) => [entry.sourceId, entry]));
};

const buildEntryData = ({ marketplaceRanking, entry, existing, syncedAt }) => {
  const product = entry.product || {};
  const enrichmentStatus = normalizeEnrichmentStatus(entry.enrichmentStatus);

  return {
    position: entry.position,
    previousPosition: existing?.position ?? null,
    sourceId: entry.sourceId,
    sourceType: entry.sourceType === 'item' ? 'item' : 'product',
    marketplaceProductId: product.marketplaceProductId || null,
    marketplaceItemId: product.marketplaceItemId || null,
    titleSnapshot: product.title || null,
    brandSnapshot: product.brand || null,
    modelSnapshot: product.model || null,
    priceSnapshot: product.price ?? null,
    oldPriceSnapshot: product.oldPrice ?? null,
    currencySnapshot: product.currency || 'BRL',
    imageUrlSnapshot: product.imageUrl || null,
    permalinkSnapshot: product.permalink || null,
    categoryIdSnapshot: product.categoryId || null,
    ratingSnapshot: product.rating ?? null,
    reviewCountSnapshot: product.reviewCount ?? null,
    soldQuantitySnapshot: product.soldQuantity ?? null,
    enrichmentStatus,
    missingFields: entry.missingFields || [],
    errors: entry.errors || [],
    firstSeenAt: existing?.firstSeenAt || syncedAt,
    lastSeenAt: syncedAt,
    lastSyncAt: syncedAt,
    status: normalizeEntryStatus(enrichmentStatus),
    marketplaceRanking: marketplaceRanking.id,
  };
};

const upsertEntries = async (strapi, marketplaceRanking, entries, syncedAt) => {
  const existingBySourceId = await findExistingEntries(strapi, marketplaceRanking.id);
  let createdEntries = 0;
  let updatedEntries = 0;

  for (const entry of entries) {
    const existing = existingBySourceId.get(entry.sourceId);
    const data = buildEntryData({
      marketplaceRanking,
      entry,
      existing,
      syncedAt,
    });

    if (existing) {
      await query(strapi, uid.marketplaceRankingEntry).update({
        where: { id: existing.id },
        data,
      });
      updatedEntries += 1;
    } else {
      await query(strapi, uid.marketplaceRankingEntry).create({ data });
      createdEntries += 1;
    }
  }

  const currentSourceIds = new Set(entries.map((entry) => entry.sourceId));
  const missingEntries = [];

  for (const existing of existingBySourceId.values()) {
    if (currentSourceIds.has(existing.sourceId)) {
      continue;
    }

    await query(strapi, uid.marketplaceRankingEntry).update({
      where: { id: existing.id },
      data: {
        previousPosition: existing.position ?? null,
        status: 'missing',
        lastSyncAt: syncedAt,
      },
    });
    missingEntries.push(existing);
  }

  return {
    createdEntries,
    updatedEntries,
    missingEntries: missingEntries.length,
  };
};

const syncMarketplaceRanking = async (
  strapi,
  {
    siteId = DEFAULT_SITE_ID,
    categoryId,
    title,
    externalCategoryName,
    sourceUrl,
    limit = DEFAULT_LIMIT,
    localCategoryId,
    localSubCategoryId,
  } = {}
) => {
  if (!strapi?.db) {
    throw new Error('strapi instance is required');
  }

  if (!categoryId || typeof categoryId !== 'string') {
    throw new Error('categoryId is required');
  }

  const syncedAt = now();
  const enrichmentResult = await getMarketplaceRankingProducts({
    siteId,
    categoryId,
    limit,
  });
  const entries = buildCurrentEntries(enrichmentResult);
  const contentFingerprint = createFingerprint(entries);
  const existing = await findMarketplaceRanking(strapi, { siteId, categoryId });
  const effectiveTitle = title || buildDefaultTitle({ externalCategoryName, categoryId });
  const rankingData = {
    marketplace: MARKETPLACE,
    siteId,
    externalCategoryId: categoryId,
    externalCategoryName: externalCategoryName || categoryId,
    title: effectiveTitle,
    slug: existing?.slug || buildSlug({ siteId, categoryId, title: effectiveTitle }),
    sourceUrl: sourceUrl || buildDefaultSourceUrl({ siteId, categoryId }),
    status: 'active',
    lastSyncAt: syncedAt,
    lastSyncStatus: getSyncStatus(enrichmentResult),
    lastSyncError: getSyncError(enrichmentResult),
    totalHighlights: enrichmentResult.totalHighlights,
    totalEnriched: enrichmentResult.totalEnriched,
    totalPublishable: enrichmentResult.totalPublishable,
    publishableRate: enrichmentResult.publishableRate,
    contentFingerprint,
  };

  if (localCategoryId) {
    rankingData.category = localCategoryId;
  }

  if (localSubCategoryId) {
    rankingData.subCategory = localSubCategoryId;
  }

  const marketplaceRanking = await upsertMarketplaceRanking(strapi, rankingData, existing);
  const entryCounts = await upsertEntries(strapi, marketplaceRanking, entries, syncedAt);

  return {
    success: true,
    marketplaceRankingId: marketplaceRanking.id,
    totalHighlights: enrichmentResult.totalHighlights,
    totalEnriched: enrichmentResult.totalEnriched,
    totalPublishable: enrichmentResult.totalPublishable,
    publishableRate: enrichmentResult.publishableRate,
    createdEntries: entryCounts.createdEntries,
    updatedEntries: entryCounts.updatedEntries,
    missingEntries: entryCounts.missingEntries,
    skippedEntries: enrichmentResult.skipped.length,
    contentFingerprint,
  };
};

module.exports = {
  syncMarketplaceRanking,
};
