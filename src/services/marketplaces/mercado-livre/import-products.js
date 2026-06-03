'use strict';

const MARKETPLACE_DATA = {
  name: 'Mercado Livre',
  slug: 'mercado-livre',
  baseUrl: 'https://www.mercadolivre.com.br',
  status: 'active',
};

const slugify = (value = '') => {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
};

const sanitizeId = (value) => {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const ensureMarketplace = async (strapi) => {
  const existing = await strapi.db.query('api::marketplace.marketplace').findOne({
    where: {
      slug: MARKETPLACE_DATA.slug,
    },
  });

  if (existing) {
    return strapi.db.query('api::marketplace.marketplace').update({
      where: { id: existing.id },
      data: MARKETPLACE_DATA,
    });
  }

  return strapi.db.query('api::marketplace.marketplace').create({
    data: MARKETPLACE_DATA,
  });
};

const getRequiredRelation = async (strapi, uid, id, label) => {
  const relationId = sanitizeId(id);

  if (!relationId) {
    throw new Error(`${label} is required`);
  }

  const relation = await strapi.db.query(uid).findOne({
    where: {
      id: relationId,
    },
  });

  if (!relation) {
    throw new Error(`${label} not found`);
  }

  return relation;
};

const buildProductData = ({ product, marketplace, category, subCategory }) => {
  const name = product.title || product.name || product.marketplaceProductId;

  return {
    name,
    slug: slugify(name || product.marketplaceProductId),
    shortDescription: product.shortDescription || name,
    marketplaceProductId: product.marketplaceProductId,
    marketplaceUrl: product.permalink,
    imageUrl: product.thumbnail,
    price: product.price ?? null,
    oldPrice: product.originalPrice ?? null,
    currency: product.currency || 'BRL',
    rating: product.rating ?? null,
    reviewCount: product.reviewCount ?? null,
    soldQuantity: product.soldQuantity ?? null,
    brand: product.brand || null,
    model: product.model || null,
    attributes: product.attributes || {},
    status: 'imported',
    lastSyncedAt: new Date().toISOString(),
    marketplace: marketplace.id,
    category: category.id,
    subCategory: subCategory.id,
  };
};

const upsertProduct = async (strapi, productData) => {
  const existing = await strapi.db.query('api::product.product').findOne({
    where: {
      marketplaceProductId: productData.marketplaceProductId,
    },
  });

  if (existing) {
    return strapi.db.query('api::product.product').update({
      where: { id: existing.id },
      data: productData,
    });
  }

  return strapi.db.query('api::product.product').create({
    data: productData,
  });
};

const upsertAffiliateLink = async (strapi, product, marketplace, sourceProduct) => {
  const existing = await strapi.db.query('api::affiliate-link.affiliate-link').findOne({
    where: {
      product: {
        id: product.id,
      },
      marketplace: {
        id: marketplace.id,
      },
    },
  });
  const data = {
    originalUrl: sourceProduct.permalink,
    affiliateUrl: sourceProduct.permalink,
    status: 'active',
    createdFrom: 'api',
    lastCheckedAt: new Date().toISOString(),
    product: product.id,
    marketplace: marketplace.id,
  };

  if (existing) {
    return strapi.db.query('api::affiliate-link.affiliate-link').update({
      where: { id: existing.id },
      data,
    });
  }

  return strapi.db.query('api::affiliate-link.affiliate-link').create({
    data,
  });
};

const importProducts = async (strapi, payload = {}) => {
  const products = Array.isArray(payload.products) ? payload.products : [];

  if (!products.length) {
    throw new Error('Products are required');
  }

  const category = await getRequiredRelation(
    strapi,
    'api::category.category',
    payload.categoryId,
    'categoryId'
  );
  const subCategory = await getRequiredRelation(
    strapi,
    'api::sub-category.sub-category',
    payload.subCategoryId,
    'subCategoryId'
  );
  const marketplace = await ensureMarketplace(strapi);
  const imported = [];
  const skipped = [];

  for (const sourceProduct of products) {
    if (!sourceProduct.marketplaceProductId || !sourceProduct.permalink) {
      skipped.push({
        marketplaceProductId: sourceProduct.marketplaceProductId || null,
        reason: 'missing marketplaceProductId or permalink',
      });
      continue;
    }

    const productData = buildProductData({
      product: sourceProduct,
      marketplace,
      category,
      subCategory,
    });
    const product = await upsertProduct(strapi, productData);
    const affiliateLink = await upsertAffiliateLink(strapi, product, marketplace, sourceProduct);

    imported.push({
      id: product.id,
      marketplaceProductId: product.marketplaceProductId,
      name: product.name,
      slug: product.slug,
      status: product.status,
      affiliateLinkId: affiliateLink.id,
    });
  }

  return {
    success: true,
    imported: imported.length,
    skipped: skipped.length,
    products: imported,
    skippedProducts: skipped,
  };
};

module.exports = {
  importProducts,
};
