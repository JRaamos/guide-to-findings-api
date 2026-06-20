'use strict';

const {
  rankProductsForIntent,
} = require('../../seo-intelligence/intent-aware-ranking');

const uid = {
  marketplaceRanking: 'api::marketplace-ranking.marketplace-ranking',
  marketplaceRankingEntry: 'api::marketplace-ranking-entry.marketplace-ranking-entry',
  ranking: 'api::ranking.ranking',
  rankingItem: 'api::ranking-item.ranking-item',
  affiliateLink: 'api::affiliate-link.affiliate-link',
};

const MARKETPLACE = 'mercado-livre';
const DEFAULT_SITE_ID = 'MLB';
const DEFAULT_RANKING_TYPE = 'top10';
const DEFAULT_RANKING_STATUS = 'draft';
const DEFAULT_CTA_TEXT = 'Ver oferta';
const DEFAULT_DISPLAY_LIMIT = 10;
const MIN_DISPLAY_LIMIT = 5;
const MAX_DISPLAY_LIMIT = 20;

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const parseId = (value) => {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const sanitizeText = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const normalizeDisplayLimit = (value) => {
  const parsedLimit = Number(value);

  if (!Number.isInteger(parsedLimit)) {
    return DEFAULT_DISPLAY_LIMIT;
  }

  return Math.min(MAX_DISPLAY_LIMIT, Math.max(MIN_DISPLAY_LIMIT, parsedLimit));
};

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

const findMarketplaceRanking = (strapi, { marketplaceRankingId, siteId, categoryId }) => {
  if (marketplaceRankingId) {
    return query(strapi, uid.marketplaceRanking).findOne({
      where: {
        id: marketplaceRankingId,
      },
      populate: ['editorialRanking', 'category', 'subCategory'],
    });
  }

  return query(strapi, uid.marketplaceRanking).findOne({
    where: {
      marketplace: MARKETPLACE,
      siteId,
      externalCategoryId: categoryId,
    },
    populate: ['editorialRanking', 'category', 'subCategory'],
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
    populate: ['product'],
    limit: 1000,
  });
};

const isPublishableEntry = (entry) => {
  return entry.status === 'active' || entry.enrichmentStatus === 'publishable';
};

const buildRankingTitle = (marketplaceRanking) => {
  return (
    sanitizeText(marketplaceRanking.title) ||
    `Mais vendidos Mercado Livre ${marketplaceRanking.externalCategoryId}`
  );
};

const buildRankingSlug = (marketplaceRanking, title) => {
  return sanitizeText(marketplaceRanking.slug) || slugify(`${marketplaceRanking.siteId}-${title}`);
};

const findRankingWithPage = (strapi, where) => {
  return query(strapi, uid.ranking).findOne({
    where,
    populate: ['page'],
  });
};

const findExistingRanking = async (
  strapi,
  marketplaceRanking,
  { rankingSlug, editorialKey, editorialIntent }
) => {
  if (editorialKey) {
    const intentRanking = await findRankingWithPage(strapi, { editorialKey });

    if (intentRanking) {
      return intentRanking;
    }
  }

  if (marketplaceRanking.editorialRanking?.id) {
    const linkedRanking = await findRankingWithPage(strapi, {
      id: marketplaceRanking.editorialRanking.id,
    });
    const linkedIntentIsCompatible =
      !editorialKey ||
      linkedRanking?.editorialKey === editorialKey ||
      (!linkedRanking?.editorialKey && (!linkedRanking?.page?.id || editorialIntent === 'best'));

    if (linkedIntentIsCompatible) {
      return linkedRanking;
    }
  }

  if (!editorialKey) {
    return findRankingWithPage(strapi, { slug: rankingSlug });
  }

  return null;
};

const hasPublishedPage = (ranking) => {
  return ranking?.page?.status === 'published' || Boolean(ranking?.page?.publishedAt);
};

const upsertEditorialRanking = async (
  strapi,
  marketplaceRanking,
  { editorialIntent, editorialKey, titleHint, slugHint }
) => {
  const title = sanitizeText(titleHint) || buildRankingTitle(marketplaceRanking);
  const slug = sanitizeText(slugHint) || buildRankingSlug(marketplaceRanking, title);
  const existing = await findExistingRanking(strapi, marketplaceRanking, {
    rankingSlug: slug,
    editorialKey,
    editorialIntent,
  });

  if (hasPublishedPage(existing)) {
    return {
      action: 'protected-published',
      record: existing,
      protectedPublishedPage: true,
    };
  }

  const data = {
    title,
    slug,
    rankingType: existing?.rankingType || DEFAULT_RANKING_TYPE,
    status: existing?.status || DEFAULT_RANKING_STATUS,
    editorialIntent: editorialIntent || existing?.editorialIntent || null,
    editorialKey: editorialKey || existing?.editorialKey || null,
  };

  if (marketplaceRanking.category?.id) {
    data.category = marketplaceRanking.category.id;
  }

  if (marketplaceRanking.subCategory?.id) {
    data.subCategory = marketplaceRanking.subCategory.id;
  }

  if (existing) {
    const record = await query(strapi, uid.ranking).update({
      where: {
        id: existing.id,
      },
      data,
    });

    return {
      action: 'updated',
      record,
    };
  }

  const record = await query(strapi, uid.ranking).create({
    data: {
      ...data,
      generatedByAi: false,
    },
  });

  return {
    action: 'created',
    record,
  };
};

const linkMarketplaceRankingToEditorialRanking = async (strapi, marketplaceRankingId, rankingId) => {
  await query(strapi, uid.marketplaceRanking).update({
    where: {
      id: marketplaceRankingId,
    },
    data: {
      editorialRanking: rankingId,
    },
  });
};

const findActiveAffiliateLink = async (strapi, productId) => {
  const active = await query(strapi, uid.affiliateLink).findOne({
    where: {
      product: {
        id: productId,
      },
      status: 'active',
    },
  });

  if (active) {
    return active;
  }

  return query(strapi, uid.affiliateLink).findOne({
    where: {
      product: {
        id: productId,
      },
    },
  });
};

const buildEligibleItems = (entries) => {
  const items = [];
  const skipped = [];
  const productIds = new Set();
  const positions = new Set();

  for (const entry of entries) {
    if (!isPublishableEntry(entry)) {
      skipped.push({
        entryId: entry.id,
        sourceId: entry.sourceId,
        position: entry.position,
        reason: 'entry is not publishable',
      });
      continue;
    }

    if (!entry.product?.id) {
      skipped.push({
        entryId: entry.id,
        sourceId: entry.sourceId,
        position: entry.position,
        reason: 'entry has no linked product',
      });
      continue;
    }

    if (productIds.has(entry.product.id)) {
      skipped.push({
        entryId: entry.id,
        sourceId: entry.sourceId,
        position: entry.position,
        productId: entry.product.id,
        reason: 'duplicated product in ranking entries',
      });
      continue;
    }

    if (positions.has(entry.position)) {
      skipped.push({
        entryId: entry.id,
        sourceId: entry.sourceId,
        position: entry.position,
        productId: entry.product.id,
        reason: 'duplicated position in ranking entries',
      });
      continue;
    }

    productIds.add(entry.product.id);
    positions.add(entry.position);
    items.push({
      entryId: entry.id,
      position: entry.position,
      product: entry.product,
      rankingProduct: {
        ...entry.product,
        position: entry.position,
        name: entry.product.name || entry.titleSnapshot,
        price: entry.product.price ?? entry.priceSnapshot,
        oldPrice: entry.product.oldPrice ?? entry.oldPriceSnapshot,
        rating: entry.product.rating ?? entry.ratingSnapshot,
        reviewCount: entry.product.reviewCount ?? entry.reviewCountSnapshot,
        brand: entry.product.brand || entry.brandSnapshot,
        model: entry.product.model || entry.modelSnapshot,
      },
    });
  }

  return {
    items,
    skipped,
  };
};

const findExistingRankingItems = async (strapi, rankingId) => {
  return query(strapi, uid.rankingItem).findMany({
    where: {
      ranking: {
        id: rankingId,
      },
    },
    populate: ['product'],
    limit: 1000,
  });
};

const buildRankingItemData = ({
  ranking,
  product,
  affiliateLink,
  position,
  originalPosition,
  intentScore,
  scoreBreakdown,
  existing,
}) => ({
  position,
  title: existing?.title || product.name,
  summary: existing?.summary || product.shortDescription || product.description || null,
  pros: existing?.pros || [],
  cons: existing?.cons || [],
  highlight: existing?.highlight || null,
  score: existing?.score ?? null,
  metadata: {
    ...(existing?.metadata || {}),
    originalMarketplacePosition: originalPosition,
    intentScore,
    intentScoreBreakdown: scoreBreakdown,
  },
  ctaText: existing?.ctaText || DEFAULT_CTA_TEXT,
  status: 'active',
  ranking: ranking.id,
  product: product.id,
  affiliateLink: affiliateLink?.id || null,
});

const upsertRankingItems = async (strapi, ranking, items) => {
  const existingItems = await findExistingRankingItems(strapi, ranking.id);
  const activeProductIds = new Set(items.map((item) => item.product.id));
  const existingByProductId = new Map(
    existingItems
      .filter((item) => item.product?.id)
      .map((item) => [item.product.id, item])
  );
  const products = [];
  let createdRankingItems = 0;
  let updatedRankingItems = 0;
  let deactivatedRankingItems = 0;

  for (const existingItem of existingItems) {
    const productId = existingItem.product?.id;

    if (!productId || activeProductIds.has(productId) || existingItem.status === 'inactive') {
      continue;
    }

    await query(strapi, uid.rankingItem).update({
      where: {
        id: existingItem.id,
      },
      data: {
        status: 'inactive',
      },
    });
    deactivatedRankingItems += 1;
  }

  for (const item of items) {
    const existing = existingByProductId.get(item.product.id);
    const affiliateLink = await findActiveAffiliateLink(strapi, item.product.id);
    const data = buildRankingItemData({
      ranking,
      product: item.product,
      affiliateLink,
      position: item.position,
      originalPosition: item.sourcePosition,
      intentScore: item.intentScore,
      scoreBreakdown: item.scoreBreakdown,
      existing,
    });
    let record;
    let action;

    if (existing) {
      record = await query(strapi, uid.rankingItem).update({
        where: {
          id: existing.id,
        },
        data,
      });
      updatedRankingItems += 1;
      action = 'updated';
    } else {
      record = await query(strapi, uid.rankingItem).create({
        data,
      });
      createdRankingItems += 1;
      action = 'created';
    }

    products.push({
      rankingItemId: record.id,
      rankingItemAction: action,
      productId: item.product.id,
      marketplaceProductId: item.product.marketplaceProductId,
      position: item.position,
      sourcePosition: item.sourcePosition || item.position,
      intentScore: item.intentScore,
      intentScoreBreakdown: item.scoreBreakdown,
      affiliateLinkId: affiliateLink?.id || null,
      sourceEntryId: item.entryId,
    });
  }

  return {
    createdRankingItems,
    updatedRankingItems,
    deactivatedRankingItems,
    products,
  };
};

const syncMarketplaceRankingEditorial = async (
  strapi,
  {
    siteId = DEFAULT_SITE_ID,
    categoryId,
    marketplaceRankingId,
    displayLimit = DEFAULT_DISPLAY_LIMIT,
    keyword,
    editorialIntent = 'best',
    intentModifier,
    editorialKey,
    titleHint,
    slugHint,
  } = {}
) => {
  if (!strapi?.db) {
    throw new Error('strapi instance is required');
  }

  if (!marketplaceRankingId && (!categoryId || typeof categoryId !== 'string')) {
    throw new Error('categoryId is required when marketplaceRankingId is not provided');
  }

  const sanitizedMarketplaceRankingId = parseId(marketplaceRankingId);
  const marketplaceRanking = await findMarketplaceRanking(strapi, {
    marketplaceRankingId: sanitizedMarketplaceRankingId,
    siteId,
    categoryId,
  });

  if (!marketplaceRanking) {
    throw new Error('MarketplaceRanking not found');
  }

  const entries = await findMarketplaceRankingEntries(strapi, marketplaceRanking.id);
  const { items, skipped } = buildEligibleItems(entries);
  const normalizedDisplayLimit = normalizeDisplayLimit(displayLimit);
  const itemsByProductId = new Map(items.map((item) => [item.product.id, item]));
  const rankedProducts = rankProductsForIntent({
    intent: editorialIntent,
    keyword: keyword || marketplaceRanking.title,
    intentModifier,
    products: items.map((item) => item.rankingProduct),
  });
  const displayItems = rankedProducts
    .slice(0, normalizedDisplayLimit)
    .map((rankedItem) => {
      const item = itemsByProductId.get(rankedItem.product.id);

      return {
        ...item,
        sourcePosition: rankedItem.originalPosition,
        position: rankedItem.editorialPosition,
        intentScore: rankedItem.intentScore,
        scoreBreakdown: rankedItem.scoreBreakdown,
      };
    });

  if (!displayItems.length) {
    throw new Error('No publishable MarketplaceRankingEntry with linked Product found');
  }

  const rankingResult = await upsertEditorialRanking(strapi, marketplaceRanking, {
    editorialIntent,
    editorialKey,
    titleHint,
    slugHint,
  });

  if (rankingResult.protectedPublishedPage) {
    return {
      success: true,
      marketplaceRankingId: marketplaceRanking.id,
      rankingId: rankingResult.record.id,
      rankingAction: rankingResult.action,
      protectedPublishedPage: true,
      siteId: marketplaceRanking.siteId,
      categoryId: marketplaceRanking.externalCategoryId,
      totalEntries: entries.length,
      eligibleEntries: items.length,
      displayLimit: normalizedDisplayLimit,
      displayedEntries: 0,
      createdRankingItems: 0,
      updatedRankingItems: 0,
      deactivatedRankingItems: 0,
      skippedEntries: skipped,
      products: [],
    };
  }

  if (
    !marketplaceRanking.editorialRanking?.id ||
    marketplaceRanking.editorialRanking.id === rankingResult.record.id
  ) {
    await linkMarketplaceRankingToEditorialRanking(
      strapi,
      marketplaceRanking.id,
      rankingResult.record.id
    );
  }

  const itemResult = await upsertRankingItems(strapi, rankingResult.record, displayItems);

  return {
    success: true,
    marketplaceRankingId: marketplaceRanking.id,
    rankingId: rankingResult.record.id,
    rankingAction: rankingResult.action,
    protectedPublishedPage: false,
    rankingStrategy: rankedProducts[0]?.strategy || 'best',
    siteId: marketplaceRanking.siteId,
    categoryId: marketplaceRanking.externalCategoryId,
    totalEntries: entries.length,
    eligibleEntries: items.length,
    displayLimit: normalizedDisplayLimit,
    displayedEntries: displayItems.length,
    createdRankingItems: itemResult.createdRankingItems,
    updatedRankingItems: itemResult.updatedRankingItems,
    deactivatedRankingItems: itemResult.deactivatedRankingItems,
    skippedEntries: skipped,
    products: itemResult.products,
  };
};

module.exports = {
  syncMarketplaceRankingEditorial,
};
