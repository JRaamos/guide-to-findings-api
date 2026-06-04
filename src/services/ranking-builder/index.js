'use strict';

const uid = {
  ranking: 'api::ranking.ranking',
  rankingItem: 'api::ranking-item.ranking-item',
  product: 'api::product.product',
  category: 'api::category.category',
  subCategory: 'api::sub-category.sub-category',
  affiliateLink: 'api::affiliate-link.affiliate-link',
};

const DEFAULT_RANKING_TYPE = 'top10';
const DEFAULT_RANKING_STATUS = 'draft';
const DEFAULT_CTA_TEXT = 'Ver oferta';
const BLOCKED_PRODUCT_STATUSES = ['rejected', 'archived'];
const ELIGIBLE_PRODUCT_STATUSES = ['imported', 'review', 'approved'];

const parseId = (value) => {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const sanitizeText = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const sanitizeOptionalText = (value) => {
  const text = sanitizeText(value);

  return text || null;
};

const getQuery = (strapi, modelUid) => strapi.db.query(modelUid);

const getRequiredRecord = async (strapi, modelUid, id, label, populate) => {
  const recordId = parseId(id);

  if (!recordId) {
    throw new Error(`${label} is required`);
  }

  const record = await getQuery(strapi, modelUid).findOne({
    where: { id: recordId },
    populate,
  });

  if (!record) {
    throw new Error(`${label} not found`);
  }

  return record;
};

const normalizeProductsPayload = (products) => {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('products are required');
  }

  const seenProducts = new Set();
  const seenPositions = new Set();

  return products.map((item) => {
    const productId = parseId(item?.productId);
    const position = Number(item?.position);

    if (!productId) {
      throw new Error('productId is required for every ranking item');
    }

    if (!Number.isInteger(position) || position <= 0) {
      throw new Error('position must be a positive integer for every ranking item');
    }

    if (seenProducts.has(productId)) {
      throw new Error(`duplicated productId: ${productId}`);
    }

    if (seenPositions.has(position)) {
      throw new Error(`duplicated position: ${position}`);
    }

    seenProducts.add(productId);
    seenPositions.add(position);

    return {
      productId,
      position,
      title: sanitizeOptionalText(item.title),
      summary: sanitizeOptionalText(item.summary),
      pros: Array.isArray(item.pros) ? item.pros : undefined,
      cons: Array.isArray(item.cons) ? item.cons : undefined,
      highlight: sanitizeOptionalText(item.highlight),
      score: item.score ?? undefined,
      ctaText: sanitizeOptionalText(item.ctaText),
    };
  });
};

const validateContext = async (strapi, payload) => {
  const categoryId = parseId(payload.categoryId);
  const subCategoryId = parseId(payload.subCategoryId);

  if (categoryId) {
    await getRequiredRecord(strapi, uid.category, categoryId, 'categoryId');
  }

  if (subCategoryId) {
    const subCategory = await getRequiredRecord(
      strapi,
      uid.subCategory,
      subCategoryId,
      'subCategoryId',
      ['category']
    );

    if (categoryId && subCategory.category?.id !== categoryId) {
      throw new Error('subCategoryId does not belong to categoryId');
    }
  }

  return {
    categoryId,
    subCategoryId,
  };
};

const getProductsByPayload = async (strapi, items, context) => {
  const products = [];

  for (const item of items) {
    const product = await getRequiredRecord(strapi, uid.product, item.productId, 'productId', [
      'category',
      'subCategory',
    ]);

    if (BLOCKED_PRODUCT_STATUSES.includes(product.status)) {
      throw new Error(`productId ${item.productId} cannot be used with status ${product.status}`);
    }

    if (context.categoryId && product.category?.id !== context.categoryId) {
      throw new Error(`productId ${item.productId} does not belong to categoryId`);
    }

    if (context.subCategoryId && product.subCategory?.id !== context.subCategoryId) {
      throw new Error(`productId ${item.productId} does not belong to subCategoryId`);
    }

    products.push(product);
  }

  return products;
};

const findActiveAffiliateLink = async (strapi, productId) => {
  const active = await getQuery(strapi, uid.affiliateLink).findOne({
    where: {
      product: { id: productId },
      status: 'active',
    },
  });

  if (active) {
    return active;
  }

  return getQuery(strapi, uid.affiliateLink).findOne({
    where: {
      product: { id: productId },
    },
  });
};

const getRankingPopulate = () => ({
  items: {
    populate: {
      product: {
        populate: ['category', 'subCategory'],
      },
      affiliateLink: true,
    },
    orderBy: {
      position: 'asc',
    },
  },
  page: true,
});

const formatProduct = (product) => {
  if (!product) {
    return null;
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    oldPrice: product.oldPrice,
    currency: product.currency,
    imageUrl: product.imageUrl,
    brand: product.brand,
    availability: product.availability,
    status: product.status,
    marketplaceProductId: product.marketplaceProductId,
    categoryId: product.category?.id || null,
    subCategoryId: product.subCategory?.id || null,
  };
};

const formatAffiliateLink = (affiliateLink) => {
  if (!affiliateLink) {
    return null;
  }

  return {
    id: affiliateLink.id,
    status: affiliateLink.status,
    affiliateUrl: affiliateLink.affiliateUrl,
  };
};

const formatRankingItem = (item) => ({
  id: item.id,
  position: item.position,
  title: item.title,
  summary: item.summary,
  pros: item.pros || [],
  cons: item.cons || [],
  highlight: item.highlight,
  score: item.score,
  ctaText: item.ctaText,
  status: item.status,
  product: formatProduct(item.product),
  affiliateLink: formatAffiliateLink(item.affiliateLink),
});

const getRankingContext = (ranking) => {
  const items = Array.isArray(ranking.items) ? ranking.items : [];
  const product = items.find((item) => item.product)?.product;

  return {
    categoryId: product?.category?.id || null,
    subCategoryId: product?.subCategory?.id || null,
  };
};

const formatRanking = (ranking) => {
  const context = getRankingContext(ranking);

  return {
    id: ranking.id,
    title: ranking.title,
    slug: ranking.slug,
    description: ranking.description,
    rankingType: ranking.rankingType,
    status: ranking.status,
    generatedByAi: ranking.generatedByAi,
    reviewedAt: ranking.reviewedAt,
    pageId: ranking.page?.id || null,
    categoryId: context.categoryId,
    subCategoryId: context.subCategoryId,
    items: Array.isArray(ranking.items) ? ranking.items.map(formatRankingItem) : [],
  };
};

const findRankingByTitle = (strapi, title) => {
  return getQuery(strapi, uid.ranking).findOne({
    where: { title },
  });
};

const findRankingBySlug = (strapi, slug) => {
  return getQuery(strapi, uid.ranking).findOne({
    where: { slug },
  });
};

const findRankingById = async (strapi, id) => {
  const ranking = await getRequiredRecord(strapi, uid.ranking, id, 'rankingId', getRankingPopulate());

  return formatRanking(ranking);
};

const upsertRanking = async (strapi, payload, id) => {
  const title = sanitizeText(payload.title);

  if (!title) {
    throw new Error('title is required');
  }

  const data = {
    title,
    description: sanitizeOptionalText(payload.description),
    rankingType: sanitizeText(payload.rankingType) || DEFAULT_RANKING_TYPE,
    status: sanitizeText(payload.status) || DEFAULT_RANKING_STATUS,
    generatedByAi: false,
  };
  const slug = sanitizeOptionalText(payload.slug);
  const rankingId = parseId(id);

  if (slug) {
    data.slug = slug;
  }

  if (rankingId) {
    await getRequiredRecord(strapi, uid.ranking, rankingId, 'rankingId');

    return getQuery(strapi, uid.ranking).update({
      where: { id: rankingId },
      data,
    });
  }

  const existing = slug
    ? await findRankingBySlug(strapi, slug)
    : await findRankingByTitle(strapi, title);

  if (existing) {
    return getQuery(strapi, uid.ranking).update({
      where: { id: existing.id },
      data,
    });
  }

  return getQuery(strapi, uid.ranking).create({
    data,
  });
};

const buildRankingItemData = ({ ranking, product, affiliateLink, item, existing }) => ({
  position: item.position,
  title: item.title || existing?.title || product.name,
  summary: item.summary || existing?.summary || product.shortDescription || product.description || null,
  pros: item.pros ?? existing?.pros ?? [],
  cons: item.cons ?? existing?.cons ?? [],
  highlight: item.highlight || existing?.highlight || null,
  score: item.score ?? existing?.score ?? null,
  ctaText: item.ctaText || existing?.ctaText || DEFAULT_CTA_TEXT,
  status: 'active',
  ranking: ranking.id,
  product: product.id,
  affiliateLink: affiliateLink?.id || null,
});

const upsertRankingItems = async (strapi, ranking, items, products) => {
  const activeProductIds = items.map((item) => item.productId);

  const existingItems = await getQuery(strapi, uid.rankingItem).findMany({
    where: {
      ranking: { id: ranking.id },
    },
    populate: ['product'],
  });
  const existingByProductId = new Map(
    existingItems
      .filter((item) => item.product?.id)
      .map((item) => [item.product.id, item])
  );

  for (const existingItem of existingItems) {
    const productId = existingItem.product?.id;

    if (productId && !activeProductIds.includes(productId) && existingItem.status !== 'inactive') {
      await getQuery(strapi, uid.rankingItem).update({
        where: { id: existingItem.id },
        data: { status: 'inactive' },
      });
    }
  }

  for (const item of items) {
    const product = products.find((entry) => entry.id === item.productId);
    const affiliateLink = await findActiveAffiliateLink(strapi, item.productId);
    const existing = existingByProductId.get(item.productId);
    const data = buildRankingItemData({
      ranking,
      product,
      affiliateLink,
      item,
      existing,
    });

    if (existing) {
      await getQuery(strapi, uid.rankingItem).update({
        where: { id: existing.id },
        data,
      });
    } else {
      await getQuery(strapi, uid.rankingItem).create({
        data,
      });
    }
  }
};

const saveRanking = async (strapi, payload, id) => {
  const productsPayload = normalizeProductsPayload(payload.products);
  const context = await validateContext(strapi, payload);
  const products = await getProductsByPayload(strapi, productsPayload, context);
  const ranking = await upsertRanking(strapi, payload, id);

  await upsertRankingItems(strapi, ranking, productsPayload, products);

  return findRankingById(strapi, ranking.id);
};

const createRanking = async (strapi, payload = {}) => {
  return saveRanking(strapi, payload);
};

const updateRanking = async (strapi, id, payload = {}) => {
  return saveRanking(strapi, payload, id);
};

const getRanking = async (strapi, id) => {
  return findRankingById(strapi, id);
};

const listRankings = async (strapi) => {
  const rankings = await getQuery(strapi, uid.ranking).findMany({
    orderBy: {
      id: 'desc',
    },
    populate: getRankingPopulate(),
  });

  return rankings.map(formatRanking);
};

const formatAvailableProduct = (product) => ({
  id: product.id,
  name: product.name,
  imageUrl: product.imageUrl,
  price: product.price,
  currency: product.currency,
  brand: product.brand,
  availability: product.availability,
  status: product.status,
  categoryId: product.category?.id || null,
  subCategoryId: product.subCategory?.id || null,
});

const listAvailableProducts = async (strapi, filters = {}) => {
  const categoryId = parseId(filters.categoryId);
  const subCategoryId = parseId(filters.subCategoryId);
  const where = {
    status: {
      $in: ELIGIBLE_PRODUCT_STATUSES,
    },
  };

  if (categoryId) {
    where.category = { id: categoryId };
  }

  if (subCategoryId) {
    where.subCategory = { id: subCategoryId };
  }

  const products = await getQuery(strapi, uid.product).findMany({
    where,
    orderBy: {
      name: 'asc',
    },
    populate: ['category', 'subCategory'],
    limit: 100,
  });

  return products.map(formatAvailableProduct);
};

module.exports = {
  createRanking,
  updateRanking,
  getRanking,
  listRankings,
  listAvailableProducts,
};
