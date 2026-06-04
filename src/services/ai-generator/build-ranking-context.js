'use strict';

const uid = {
  ranking: 'api::ranking.ranking',
};

const parseId = (value) => {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
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
    price: product.price ?? null,
    currency: product.currency || 'BRL',
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

const serializeRankingItem = (item) => ({
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
      }
    : null,
});

const getCategoryFromRanking = (ranking) => {
  const itemWithCategory = (ranking.items || []).find((item) => item.product?.category);

  return itemWithCategory?.product?.category || null;
};

const getSubCategoryFromRanking = (ranking) => {
  const itemWithSubCategory = (ranking.items || []).find((item) => item.product?.subCategory);

  return itemWithSubCategory?.product?.subCategory || null;
};

const buildRankingContext = async (strapi, rankingId) => {
  const id = parseId(rankingId);

  if (!id) {
    throw new Error('rankingId is required');
  }

  const ranking = await strapi.db.query(uid.ranking).findOne({
    where: { id },
    populate: {
      page: true,
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
    products: activeItems.map(serializeRankingItem),
  };
};

module.exports = {
  buildRankingContext,
};
