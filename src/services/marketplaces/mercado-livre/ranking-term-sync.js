'use strict';

const { resolveMarketplaceCategory } = require('./category-resolver');
const {
  syncLocalCategoriesFromMarketplaceCategory,
} = require('./category-sync');
const { syncMarketplaceRanking } = require('./ranking-sync');
const { syncMarketplaceRankingProducts } = require('./ranking-product-sync');
const { syncMarketplaceRankingEditorial } = require('./ranking-editorial-sync');

const DEFAULT_SITE_ID = 'MLB';
const DEFAULT_LIMIT = 20;
const DEFAULT_DISPLAY_LIMIT = 10;
const MINIMUM_HIGHLIGHTS = 10;
const MINIMUM_PUBLISHABLE_PRODUCTS = 10;

const normalizeTerm = (term) => {
  return typeof term === 'string' ? term.trim() : '';
};

const formatCategoryPath = (path = []) => {
  return path.map((item) => ({
    id: item.id,
    name: item.name,
  }));
};

const getResolverWarnings = (errors = []) => {
  return errors.map((error) => ({
    step: 'category-resolver',
    source: error.source || null,
    status: error.status || null,
    message: error.message,
  }));
};

const buildRankingTitle = ({ term, category }) => {
  return `Mais vendidos Mercado Livre: ${term || category.name || category.id}`;
};

const buildResolvedCategory = (category) => ({
  id: category.id,
  name: category.name,
  path: formatCategoryPath(category.path),
  source: category.source,
  confidence: category.confidence,
  hasHighlights: Boolean(category.hasHighlights),
  highlightsCount: category.highlightsCount || 0,
});

const syncMarketplaceRankingByTerm = async (
  strapi,
  {
    term,
    siteId = DEFAULT_SITE_ID,
    limit = DEFAULT_LIMIT,
    displayLimit = DEFAULT_DISPLAY_LIMIT,
  } = {}
) => {
  if (!strapi?.db) {
    throw new Error('strapi instance is required');
  }

  const normalizedTerm = normalizeTerm(term);

  if (!normalizedTerm) {
    throw new Error('term is required');
  }

  const warnings = [];
  const errors = [];
  const categoryResult = await resolveMarketplaceCategory({
    siteId,
    term: normalizedTerm,
    validateHighlights: true,
  });
  const category = categoryResult.bestCategory;

  warnings.push(...getResolverWarnings(categoryResult.errors));

  if (!categoryResult.resolved || !category?.id) {
    throw new Error(`Could not resolve Mercado Livre category for term "${normalizedTerm}"`);
  }

  if ((category.highlightsCount || 0) < MINIMUM_HIGHLIGHTS) {
    throw new Error(
      `Resolved category ${category.id} has only ${category.highlightsCount || 0} highlights`
    );
  }

  const localCategoryResult = await syncLocalCategoriesFromMarketplaceCategory(strapi, {
    term: normalizedTerm,
    resolvedCategory: category,
  });

  const marketplaceRankingResult = await syncMarketplaceRanking(strapi, {
    siteId,
    categoryId: category.id,
    title: buildRankingTitle({
      term: normalizedTerm,
      category,
    }),
    externalCategoryName: category.name,
    limit,
    localCategoryId: localCategoryResult.categoryId,
    localSubCategoryId: localCategoryResult.subCategoryId,
  });

  if ((marketplaceRankingResult.totalPublishable || 0) < MINIMUM_PUBLISHABLE_PRODUCTS) {
    throw new Error(
      `Marketplace ranking ${marketplaceRankingResult.marketplaceRankingId} has only ${marketplaceRankingResult.totalPublishable || 0} publishable products`
    );
  }

  const productResult = await syncMarketplaceRankingProducts(strapi, {
    siteId,
    categoryId: category.id,
    marketplaceRankingId: marketplaceRankingResult.marketplaceRankingId,
    localCategoryId: localCategoryResult.categoryId,
    localSubCategoryId: localCategoryResult.subCategoryId,
  });

  if ((productResult.importedProducts || 0) < MINIMUM_PUBLISHABLE_PRODUCTS) {
    throw new Error(
      `Marketplace ranking ${marketplaceRankingResult.marketplaceRankingId} imported only ${productResult.importedProducts || 0} products`
    );
  }

  const editorialResult = await syncMarketplaceRankingEditorial(strapi, {
    siteId,
    categoryId: category.id,
    marketplaceRankingId: marketplaceRankingResult.marketplaceRankingId,
    displayLimit,
  });

  if (productResult.errors?.length) {
    errors.push(
      ...productResult.errors.map((error) => ({
        step: 'products',
        ...error,
      }))
    );
  }

  return {
    success: true,
    term: normalizedTerm,
    siteId,
    resolvedCategory: buildResolvedCategory(category),
    localCategory: localCategoryResult,
    marketplaceRanking: {
      id: marketplaceRankingResult.marketplaceRankingId,
      createdEntries: marketplaceRankingResult.createdEntries,
      updatedEntries: marketplaceRankingResult.updatedEntries,
      totalHighlights: marketplaceRankingResult.totalHighlights,
      totalPublishable: marketplaceRankingResult.totalPublishable,
      publishableRate: marketplaceRankingResult.publishableRate,
    },
    products: {
      imported: productResult.importedProducts,
      created: productResult.productsCreated,
      updated: productResult.productsUpdated,
      affiliateLinksCreated: productResult.affiliateLinksCreated,
      affiliateLinksUpdated: productResult.affiliateLinksUpdated,
      linked: productResult.linkedEntries,
    },
    editorialRanking: {
      id: editorialResult.rankingId,
      created: editorialResult.rankingAction === 'created',
      updated: editorialResult.rankingAction === 'updated',
      action: editorialResult.rankingAction,
      itemsCreated: editorialResult.createdRankingItems,
      itemsUpdated: editorialResult.updatedRankingItems,
      itemsDeactivated: editorialResult.deactivatedRankingItems,
      eligibleEntries: editorialResult.eligibleEntries,
      displayLimit: editorialResult.displayLimit,
      displayedEntries: editorialResult.displayedEntries,
    },
    warnings,
    errors,
  };
};

module.exports = {
  syncMarketplaceRankingByTerm,
};
