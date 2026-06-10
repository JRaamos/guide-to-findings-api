'use strict';

const uid = {
  ranking: 'api::ranking.ranking',
  marketplaceRanking: 'api::marketplace-ranking.marketplace-ranking',
  marketplaceRankingEntry: 'api::marketplace-ranking-entry.marketplace-ranking-entry',
};

const parseId = (value) => {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const serializeEditorialPlan = (editorialPlan) => {
  if (!editorialPlan || typeof editorialPlan !== 'object') {
    return null;
  }

  return {
    productCount: editorialPlan.productCount || null,
    template: editorialPlan.template || null,
    intent: editorialPlan.intent || null,
    titleHint: editorialPlan.titleHint || null,
    slugHint: editorialPlan.slugHint || null,
    focusKeyword: editorialPlan.focusKeyword || null,
    secondaryKeywords: Array.isArray(editorialPlan.secondaryKeywords)
      ? editorialPlan.secondaryKeywords
      : [],
    sourceDisclosure: editorialPlan.sourceDisclosure || null,
  };
};

const serializeCommandContext = (commandContext) => {
  if (!commandContext || typeof commandContext !== 'object') {
    return null;
  }

  return {
    source: commandContext.source || null,
    rawMessage: commandContext.rawMessage || null,
    term: commandContext.term || null,
    normalizedTerm: commandContext.normalizedTerm || null,
    fetchLimit: commandContext.fetchLimit || null,
    displayLimit: commandContext.displayLimit || null,
    productCount: commandContext.productCount || null,
    editorialTemplate: commandContext.editorialTemplate || null,
    editorialIntent: commandContext.editorialIntent || null,
    intentModifier: commandContext.intentModifier || null,
    preferredSlug: commandContext.preferredSlug || null,
    titleHint: commandContext.titleHint || null,
    confidence: commandContext.confidence || null,
    warnings: Array.isArray(commandContext.warnings) ? commandContext.warnings : [],
    parserResult: commandContext.parserResult || null,
  };
};

const sortByPosition = (items = []) => {
  return [...items].sort((first, second) => {
    const firstPosition =
      typeof first.position === 'number' ? first.position : Number.MAX_SAFE_INTEGER;
    const secondPosition =
      typeof second.position === 'number' ? second.position : Number.MAX_SAFE_INTEGER;

    return firstPosition - secondPosition;
  });
};

const serializeProduct = (product) => {
  if (!product) {
    return null;
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: product.brand || null,
    model: product.model || null,
    marketplaceProductId: product.marketplaceProductId || null,
    marketplaceUrl: product.marketplaceUrl || null,
    imageUrl: product.imageUrl || null,
    price: product.price ?? null,
    oldPrice: product.oldPrice ?? null,
    currency: product.currency || 'BRL',
    rating: product.rating ?? null,
    reviewCount: product.reviewCount ?? null,
    soldQuantity: product.soldQuantity ?? null,
    status: product.status || null,
    availability: product.availability || 'unknown',
    shortDescription: product.shortDescription || null,
    description: product.description || null,
    marketplace: product.marketplace
      ? {
          id: product.marketplace.id,
          name: product.marketplace.name,
          slug: product.marketplace.slug,
        }
      : null,
  };
};

const serializeRankingItem = (item, marketplaceEntryByProductId) => {
  const marketplaceEntry = item.product?.id
    ? marketplaceEntryByProductId.get(item.product.id) || null
    : null;

  return {
    id: item.id,
    position: item.position,
    title: item.title || null,
    summary: item.summary || null,
    pros: item.pros || [],
    cons: item.cons || [],
    highlight: item.highlight || null,
    score: item.score ?? null,
    ctaText: item.ctaText || null,
    status: item.status,
    product: serializeProduct(item.product),
    affiliateLink: item.affiliateLink
      ? {
          id: item.affiliateLink.id,
          status: item.affiliateLink.status,
          marketplaceId: item.affiliateLink.marketplace?.id || null,
          marketplaceSlug: item.affiliateLink.marketplace?.slug || null,
          hasAffiliateUrl: Boolean(item.affiliateLink.affiliateUrl),
        }
      : null,
    marketplaceEntry: marketplaceEntry
      ? {
          id: marketplaceEntry.id,
          position: marketplaceEntry.position,
          sourceId: marketplaceEntry.sourceId,
          sourceType: marketplaceEntry.sourceType,
          enrichmentStatus: marketplaceEntry.enrichmentStatus,
          status: marketplaceEntry.status,
        }
      : null,
  };
};

const getCategoryFromRanking = (ranking) => {
  if (ranking.category) {
    return ranking.category;
  }

  const itemWithCategory = (ranking.items || []).find((item) => item.product?.category);

  return itemWithCategory?.product?.category || null;
};

const getSubCategoryFromRanking = (ranking) => {
  if (ranking.subCategory) {
    return ranking.subCategory;
  }

  const itemWithSubCategory = (ranking.items || []).find((item) => item.product?.subCategory);

  return itemWithSubCategory?.product?.subCategory || null;
};

const getMarketplaceRankingSource = async (strapi, rankingId) => {
  const marketplaceRanking = await strapi.db.query(uid.marketplaceRanking).findOne({
    where: {
      editorialRanking: {
        id: rankingId,
      },
    },
  });

  if (!marketplaceRanking) {
    return {
      source: null,
      entryByProductId: new Map(),
    };
  }

  const entries = await strapi.db.query(uid.marketplaceRankingEntry).findMany({
    where: {
      marketplaceRanking: {
        id: marketplaceRanking.id,
      },
      status: 'active',
    },
    populate: ['product'],
    limit: 1000,
  });
  const entryByProductId = new Map(
    entries
      .filter((entry) => entry.product?.id)
      .map((entry) => [entry.product.id, entry])
  );

  return {
    source: {
      type: 'marketplace-ranking',
      marketplace: 'Mercado Livre',
      marketplaceSlug: marketplaceRanking.marketplace,
      source: 'highlights',
      sourceLabel: 'mais vendidos do Mercado Livre',
      siteId: marketplaceRanking.siteId,
      externalCategoryId: marketplaceRanking.externalCategoryId,
      externalCategoryName: marketplaceRanking.externalCategoryName || null,
      sourceUrl: marketplaceRanking.sourceUrl || null,
      lastSyncAt: marketplaceRanking.lastSyncAt || null,
      totalHighlights: marketplaceRanking.totalHighlights ?? null,
      totalPublishable: marketplaceRanking.totalPublishable ?? null,
      publishableRate: marketplaceRanking.publishableRate ?? null,
    },
    entryByProductId,
  };
};

const buildRankingContext = async (strapi, rankingId, options = {}) => {
  const id = parseId(rankingId);

  if (!id) {
    throw new Error('rankingId is required');
  }

  const ranking = await strapi.db.query(uid.ranking).findOne({
    where: { id },
    populate: {
      page: true,
      category: true,
      subCategory: true,
      items: {
        populate: {
          product: {
            populate: ['category', 'subCategory', 'marketplace'],
          },
          affiliateLink: {
            populate: ['marketplace'],
          },
        },
      },
    },
  });

  if (!ranking) {
    throw new Error('Ranking not found');
  }

  const activeItems = sortByPosition(ranking.items || []).filter((item) => item.status === 'active');

  if (!activeItems.length) {
    throw new Error('Ranking must have active ranking items before generating content');
  }

  const category = getCategoryFromRanking(ranking);
  const subCategory = getSubCategoryFromRanking(ranking);
  const marketplaceRankingSource = await getMarketplaceRankingSource(strapi, ranking.id);

  const commandContext = serializeCommandContext(options.commandContext);
  const editorialPlan = serializeEditorialPlan(options.editorialPlan);
  const products = activeItems.map((item) =>
    serializeRankingItem(item, marketplaceRankingSource.entryByProductId)
  );

  return {
    ranking: {
      id: ranking.id,
      title: ranking.title,
      slug: ranking.slug,
      description: ranking.description || null,
      rankingType: ranking.rankingType,
      status: ranking.status,
      searchIntent: ranking.searchIntent || null,
      editorialNotes: ranking.editorialNotes || null,
      evaluationCriteria: ranking.evaluationCriteria || null,
      existingPage: ranking.page
        ? {
            id: ranking.page.id,
            status: ranking.page.status,
        }
        : null,
    },
    commandContext,
    editorialPlan,
    source: marketplaceRankingSource.source,
    category: category
      ? {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description || null,
        }
      : null,
    subCategory: subCategory
      ? {
          id: subCategory.id,
          name: subCategory.name,
          slug: subCategory.slug,
          description: subCategory.description || null,
        }
      : null,
    products: editorialPlan?.productCount ? products.slice(0, editorialPlan.productCount) : products,
  };
};

module.exports = {
  buildRankingContext,
};
