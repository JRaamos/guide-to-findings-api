'use strict';

const uid = {
  page: 'api::page.page',
  seo: 'api::seo.seo',
  faq: 'api::faq.faq',
  ranking: 'api::ranking.ranking',
};

const REVIEWABLE_PAGE_STATUSES = ['draft', 'review', 'aiGenerated', 'underReview', 'approved'];
const BLOCKED_PRODUCT_STATUSES = ['rejected', 'archived'];
const BLOCKED_PRODUCT_AVAILABILITY = ['outOfStock', 'unavailable', 'removed'];

const parseId = (value) => {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const sortFaqs = (faqs = []) => {
  return [...faqs].sort((first, second) => {
    const firstOrder = typeof first.order === 'number' ? first.order : Number.MAX_SAFE_INTEGER;
    const secondOrder = typeof second.order === 'number' ? second.order : Number.MAX_SAFE_INTEGER;

    return firstOrder - secondOrder;
  });
};

const getPagePopulate = () => ({
  category: true,
  subCategory: true,
  seo: true,
  faqs: true,
  ranking: {
    populate: {
      items: {
        populate: {
          product: true,
          affiliateLink: true,
        },
      },
    },
  },
});

const getRequiredPage = async (strapi, id) => {
  const pageId = parseId(id);

  if (!pageId) {
    throw new Error('pageId is required');
  }

  const page = await query(strapi, uid.page).findOne({
    where: { id: pageId },
    populate: getPagePopulate(),
  });

  if (!page) {
    throw new Error('Page not found');
  }

  return page;
};

const serializeRankingItem = (item) => ({
  id: item.id,
  position: item.position,
  status: item.status,
  product: item.product
    ? {
        id: item.product.id,
        name: item.product.name,
        status: item.product.status,
        availability: item.product.availability || null,
      }
    : null,
  affiliateLink: item.affiliateLink
    ? {
        id: item.affiliateLink.id,
        status: item.affiliateLink.status,
      }
    : null,
});

const serializeRanking = (ranking) => {
  if (!ranking) {
    return null;
  }

  return {
    id: ranking.id,
    title: ranking.title,
    slug: ranking.slug || null,
    status: ranking.status,
    itemCount: Array.isArray(ranking.items) ? ranking.items.length : 0,
    items: Array.isArray(ranking.items) ? ranking.items.map(serializeRankingItem) : [],
  };
};

const serializeSeo = (seo) => {
  if (!seo) {
    return null;
  }

  return {
    id: seo.id,
    metaTitle: seo.metaTitle,
    metaDescription: seo.metaDescription,
    canonicalUrl: seo.canonicalUrl || null,
    robots: seo.robots,
    status: seo.status,
    approvedAt: seo.approvedAt || null,
    schemaType: seo.schemaType || null,
    focusKeyword: seo.focusKeyword || null,
    secondaryKeywords: seo.secondaryKeywords || [],
  };
};

const serializeFaq = (faq) => ({
  id: faq.id,
  question: faq.question,
  answer: faq.answer,
  order: faq.order ?? null,
  status: faq.status,
  generatedByAi: Boolean(faq.generatedByAi),
  approvedAt: faq.approvedAt || null,
});

const serializePageListItem = (page) => ({
  id: page.id,
  title: page.title,
  slug: page.slug,
  status: page.status,
  approvedAt: page.approvedAt || null,
  publishedAt: page.publishedAt || null,
  seoStatus: page.seo?.status || null,
  faqCount: Array.isArray(page.faqs) ? page.faqs.length : 0,
  rankingId: page.ranking?.id || null,
});

const validatePublicationReadiness = (page) => {
  const validations = [];
  const addValidation = (key, passed, message) => {
    validations.push({
      key,
      passed,
      message,
    });
  };
  const faqs = Array.isArray(page.faqs) ? page.faqs : [];
  const rankingItems = Array.isArray(page.ranking?.items) ? page.ranking.items : [];
  const activeRankingItems = rankingItems.filter((item) => item.status === 'active');
  const missingProductItems = activeRankingItems.filter((item) => !item.product);
  const blockedProducts = activeRankingItems.filter((item) => {
    const product = item.product;

    if (!product) {
      return false;
    }

    return (
      BLOCKED_PRODUCT_STATUSES.includes(product.status) ||
      BLOCKED_PRODUCT_AVAILABILITY.includes(product.availability)
    );
  });
  const brokenAffiliateLinks = activeRankingItems.filter(
    (item) => item.affiliateLink && item.affiliateLink.status !== 'active'
  );
  const approvedFaqs = faqs.filter((faq) => faq.approvedAt);

  addValidation('page.exists', Boolean(page?.id), 'Page existe');
  addValidation('page.approved', Boolean(page.approvedAt), 'Page aprovada');
  addValidation('category.exists', Boolean(page.category?.id), 'Categoria existe');
  addValidation('category.active', page.category?.status === 'active', 'Categoria esta ativa');
  addValidation(
    'subCategory.active',
    !page.subCategory?.id || page.subCategory.status === 'active',
    'Subcategoria esta ativa quando existe'
  );
  addValidation('seo.exists', Boolean(page.seo?.id), 'Seo existe');
  addValidation('seo.approved', page.seo?.status === 'approved', 'Seo aprovado');
  addValidation('seo.approvedAt', Boolean(page.seo?.approvedAt), 'Seo possui approvedAt');
  addValidation('ranking.exists', Boolean(page.ranking?.id), 'Ranking relacionado existe');
  addValidation(
    'ranking.items',
    activeRankingItems.length > 0,
    'Ranking possui itens ativos'
  );
  addValidation(
    'products.exists',
    missingProductItems.length === 0,
    'Todos os itens ativos possuem produto'
  );
  addValidation(
    'products.available',
    blockedProducts.length === 0,
    'Produtos nao estao rejeitados, arquivados ou indisponiveis'
  );
  addValidation(
    'affiliateLinks.active',
    brokenAffiliateLinks.length === 0,
    'Links afiliados dos itens ativos estao ativos quando existem'
  );
  addValidation(
    'faqs.approved',
    faqs.length === 0 || approvedFaqs.length === faqs.length,
    'FAQs existentes estao aprovadas'
  );

  const pending = validations.filter((validation) => !validation.passed);

  return {
    ready: pending.length === 0,
    validations,
    pending,
  };
};

const serializePageDetail = (page) => ({
  id: page.id,
  title: page.title,
  slug: page.slug,
  pageType: page.pageType,
  status: page.status,
  excerpt: page.excerpt || null,
  intro: page.intro || null,
  conclusion: page.conclusion || null,
  canonicalUrl: page.canonicalUrl || null,
  approvedAt: page.approvedAt || null,
  publishedAt: page.publishedAt || null,
  category: page.category
    ? {
        id: page.category.id,
        name: page.category.name,
        slug: page.category.slug,
        status: page.category.status,
      }
    : null,
  subCategory: page.subCategory
    ? {
        id: page.subCategory.id,
        name: page.subCategory.name,
        slug: page.subCategory.slug,
        status: page.subCategory.status,
      }
    : null,
  seo: serializeSeo(page.seo),
  faqs: sortFaqs(page.faqs || []).map(serializeFaq),
  ranking: serializeRanking(page.ranking),
  publicationReadiness: validatePublicationReadiness(page),
});

const listPages = async (strapi) => {
  const pages = await query(strapi, uid.page).findMany({
    where: {
      status: {
        $in: REVIEWABLE_PAGE_STATUSES,
      },
    },
    orderBy: {
      id: 'desc',
    },
    populate: getPagePopulate(),
    limit: 100,
  });

  return pages.map(serializePageListItem);
};

const getPage = async (strapi, id) => {
  const page = await getRequiredPage(strapi, id);

  return serializePageDetail(page);
};

const approvePage = async (strapi, id) => {
  const page = await getRequiredPage(strapi, id);

  if (page.status === 'published') {
    throw new Error('Published pages cannot be approved again in Publication Workflow V1');
  }

  const approvedAt = new Date().toISOString();

  await query(strapi, uid.page).update({
    where: { id: page.id },
    data: {
      approvedAt,
    },
  });

  if (page.seo?.id) {
    await query(strapi, uid.seo).update({
      where: { id: page.seo.id },
      data: {
        status: 'approved',
        approvedAt,
      },
    });
  }

  for (const faq of page.faqs || []) {
    await query(strapi, uid.faq).update({
      where: { id: faq.id },
      data: {
        approvedAt,
      },
    });
  }

  return getPage(strapi, page.id);
};

const publishPage = async (strapi, id) => {
  const page = await getRequiredPage(strapi, id);
  const readiness = validatePublicationReadiness(page);

  if (page.status === 'published') {
    throw new Error('Page is already published');
  }

  if (!readiness.ready) {
    throw new Error(
      `Page is not ready for publication: ${readiness.pending
        .map((validation) => validation.key)
        .join(', ')}`
    );
  }

  const publishedAt = new Date().toISOString();

  await query(strapi, uid.page).update({
    where: { id: page.id },
    data: {
      status: 'published',
      publishedAt,
      approvedAt: page.approvedAt,
    },
  });

  if (page.ranking?.id) {
    await query(strapi, uid.ranking).update({
      where: { id: page.ranking.id },
      data: {
        status: 'published',
        reviewedAt: page.ranking.reviewedAt || publishedAt,
      },
    });
  }

  return getPage(strapi, page.id);
};

module.exports = {
  listPages,
  getPage,
  approvePage,
  publishPage,
  validatePublicationReadiness,
};
