'use strict';

const crypto = require('crypto');
const {
  getRelatedPages,
} = require('../../../services/seo-intelligence/internal-linking');

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_CLICK_EVENT_TYPES = ['productClick', 'affiliateClick', 'ctaClick'];

const isValidSlug = (value) => {
  return typeof value === 'string' && SLUG_PATTERN.test(value);
};

const sortByOrder = (items = []) => {
  return [...items].sort((a, b) => {
    const first = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
    const second = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;

    if (first !== second) {
      return first - second;
    }

    return (a.name || '').localeCompare(b.name || '', 'pt-BR');
  });
};

const sortByPosition = (items = []) => {
  return [...items].sort((a, b) => {
    const first = typeof a.position === 'number' ? a.position : Number.MAX_SAFE_INTEGER;
    const second = typeof b.position === 'number' ? b.position : Number.MAX_SAFE_INTEGER;

    return first - second;
  });
};

const serializeImage = (image) => {
  if (!image) {
    return null;
  }

  return {
    id: image.id,
    url: image.url,
    alt: image.alternativeText || image.name || '',
    caption: image.caption || null,
    width: image.width || null,
    height: image.height || null,
  };
};

const serializeCategory = (category) => {
  if (!category) {
    return null;
  }

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description || null,
  };
};

const serializeCategoryListItem = (category) => {
  if (!category) {
    return null;
  }

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description || null,
    featuredImage: serializeImage(category.featuredImage),
    order: category.order ?? null,
  };
};

const serializeSeo = (seo) => {
  if (!seo) {
    return null;
  }

  return {
    metaTitle: seo.metaTitle,
    metaDescription: seo.metaDescription,
    canonicalUrl: seo.canonicalUrl || null,
    ogTitle: seo.ogTitle || null,
    ogDescription: seo.ogDescription || null,
    ogImage: serializeImage(seo.ogImage),
    robots: seo.robots,
    schemaType: seo.schemaType || null,
    schemaData: seo.schemaData || null,
    focusKeyword: seo.focusKeyword || null,
    secondaryKeywords: seo.secondaryKeywords || null,
  };
};

const serializeProduct = (product) => {
  if (!product) {
    return null;
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    imageUrl: product.imageUrl || null,
    price: product.price ?? null,
    oldPrice: product.oldPrice ?? null,
    currency: product.currency || 'BRL',
    rating: product.rating ?? null,
    reviewCount: product.reviewCount ?? null,
    brand: product.brand || null,
    model: product.model || null,
  };
};

const serializeAffiliateLink = (affiliateLink) => {
  if (!affiliateLink) {
    return null;
  }

  return {
    id: affiliateLink.id,
    affiliateUrl: affiliateLink.affiliateUrl,
  };
};

const serializeRankingItem = (item) => {
  return {
    id: item.id,
    position: item.position,
    title: item.title || null,
    summary: item.summary || null,
    pros: item.pros || null,
    cons: item.cons || null,
    highlight: item.highlight || null,
    score: item.score ?? null,
    ctaText: item.ctaText || null,
    product: serializeProduct(item.product),
    affiliateLink: serializeAffiliateLink(item.affiliateLink),
  };
};

const serializeRanking = (ranking) => {
  if (!ranking || ranking.status !== 'published') {
    return null;
  }

  const activeItems = (ranking.items || []).filter((item) => item.status === 'active');

  return {
    id: ranking.id,
    title: ranking.title,
    description: ranking.description || null,
    rankingType: ranking.rankingType,
    items: sortByPosition(activeItems).map(serializeRankingItem),
  };
};

const serializeFaq = (faq) => {
  return {
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    order: faq.order || null,
  };
};

const serializeRelatedPage = (page) => {
  const categorySlug = page.category?.slug || null;

  return {
    id: page.id || page.pageId,
    pageId: page.pageId || page.id,
    title: page.title,
    slug: page.slug,
    categorySlug: page.categorySlug || categorySlug,
    url: page.url || (categorySlug ? `/${categorySlug}/${page.slug}` : null),
    editorialIntent: page.editorialIntent || null,
    score: page.score || null,
  };
};

const serializePageSummary = (page) => {
  const categorySlug = page.category?.slug || null;

  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    pageType: page.pageType,
    excerpt: page.excerpt || null,
    canonicalUrl: page.canonicalUrl || page.seo?.canonicalUrl || null,
    featuredImage: serializeImage(page.featuredImage),
    url: categorySlug ? `/${categorySlug}/${page.slug}` : null,
    categorySlug,
  };
};

const buildBreadcrumbs = (page) => {
  const breadcrumbs = [
    {
      label: 'Início',
      url: '/',
    },
  ];

  if (page.category) {
    breadcrumbs.push({
      label: page.category.name,
      url: `/${page.category.slug}`,
    });
  }

  breadcrumbs.push({
    label: page.title,
    url: page.category ? `/${page.category.slug}/${page.slug}` : null,
  });

  return breadcrumbs;
};

const buildCategoryBreadcrumbs = (category) => {
  return [
    {
      label: 'Início',
      url: '/',
    },
    {
      label: category.name,
      url: `/${category.slug}`,
    },
  ];
};

const buildCategoryFallbackSeo = (category) => {
  const description =
    category.description || `Veja guias, rankings e comparativos de ${category.name}.`;

  return {
    metaTitle: `${category.name} | Guide to Findings`,
    metaDescription: description,
    canonicalUrl: `/${category.slug}`,
    robots: 'indexFollow',
  };
};

const serializePage = (page, dynamicRelatedPages = null) => {
  const activeFaqs = (page.faqs || []).filter((faq) => faq.status === 'active');
  const publishedRelatedPages = dynamicRelatedPages || (page.relatedPages || []).filter(
    (relatedPage) => relatedPage.status === 'published'
  );

  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    pageType: page.pageType,
    status: page.status,
    excerpt: page.excerpt || null,
    intro: page.intro || null,
    conclusion: page.conclusion || null,
    approvedAt: page.approvedAt || null,
    publishedAt: page.publishedAt || null,
    updatedAt: page.updatedAt || null,
    canonicalUrl: page.canonicalUrl || page.seo?.canonicalUrl || null,
    featuredImage: serializeImage(page.featuredImage),
    category: serializeCategory(page.category),
    subCategory: serializeCategory(page.subCategory),
    seo: serializeSeo(page.seo),
    ranking: page.pageType === 'ranking' ? serializeRanking(page.ranking) : null,
    faqs: sortByOrder(activeFaqs).map(serializeFaq),
    contentBlocks: page.content || [],
    relatedPages: publishedRelatedPages.map(serializeRelatedPage),
    breadcrumbs: buildBreadcrumbs(page),
  };
};

const serializeCategoryDetail = (category) => {
  const activeSubCategories = (category.subCategories || []).filter(
    (subCategory) => subCategory.status === 'active'
  );
  const publishedPages = (category.pages || []).filter((page) => page.status === 'published');

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description || null,
    featuredImage: serializeImage(category.featuredImage),
    subCategories: sortByOrder(activeSubCategories).map(serializeCategoryListItem),
    pages: sortByOrder(publishedPages).map(serializePageSummary),
    breadcrumbs: buildCategoryBreadcrumbs(category),
    seo: buildCategoryFallbackSeo(category),
  };
};

const shouldIndexPage = (page) => {
  return (
    page.status === 'published' &&
    page.category?.status === 'active' &&
    page.seo?.robots !== 'noIndexFollow' &&
    page.seo?.robots !== 'noIndexNoFollow'
  );
};

const buildPageUrl = (page) => {
  if (!page.category?.slug) {
    return null;
  }

  return `/${page.category.slug}/${page.slug}`;
};

const serializeSitemapCategory = (category) => {
  return {
    url: `/${category.slug}`,
    lastModified: category.updatedAt || category.createdAt || null,
    changeFrequency: 'weekly',
    priority: 0.7,
  };
};

const serializeSitemapPage = (page) => {
  return {
    url: buildPageUrl(page),
    lastModified: page.updatedAt || page.createdAt || null,
    changeFrequency: 'weekly',
    priority: page.pageType === 'categoryLanding' ? 0.7 : 0.8,
  };
};

const assignRelation = (data, field, id) => {
  if (id) {
    data[field] = id;
  }
};

const sanitizeString = (value, maxLength = 500) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
};

const sanitizeId = (value) => {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const hashIp = (ip) => {
  const value = sanitizeString(ip, 200);

  if (!value) {
    return null;
  }

  return crypto.createHash('sha256').update(value).digest('hex');
};

module.exports = () => ({
  async findCategories() {
    const categories = await strapi.db.query('api::category.category').findMany({
      where: {
        status: 'active',
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      populate: {
        featuredImage: true,
      },
    });

    return sortByOrder(categories).map(serializeCategoryListItem);
  },

  async findCategoryBySlug(categorySlug) {
    if (!isValidSlug(categorySlug)) {
      return null;
    }

    const category = await strapi.db.query('api::category.category').findOne({
      where: {
        slug: categorySlug,
        status: 'active',
      },
      populate: {
        featuredImage: true,
        subCategories: true,
        pages: {
          populate: {
            featuredImage: true,
            category: true,
            seo: true,
          },
        },
      },
    });

    if (!category || category.status !== 'active') {
      return null;
    }

    return serializeCategoryDetail(category);
  },

  async findSitemap() {
    const [categories, pages] = await Promise.all([
      strapi.db.query('api::category.category').findMany({
        where: {
          status: 'active',
        },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      }),
      strapi.db.query('api::page.page').findMany({
        where: {
          status: 'published',
          category: {
            status: 'active',
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        populate: {
          category: true,
          seo: true,
        },
      }),
    ]);

    const categoryItems = sortByOrder(categories).map(serializeSitemapCategory);
    const pageItems = pages.filter(shouldIndexPage).map(serializeSitemapPage).filter((item) => item.url);

    return [...categoryItems, ...pageItems];
  },

  async createClickEvent({ payload, userAgent, referrer, ip }) {
    const eventType = sanitizeString(payload.eventType, 50);

    if (!ALLOWED_CLICK_EVENT_TYPES.includes(eventType)) {
      return { success: true };
    }

    try {
      const data = {
        eventType,
        sourcePageUrl: sanitizeString(payload.sourcePageUrl, 500),
        sourcePageTitle: sanitizeString(payload.sourcePageTitle, 255),
        userAgent: sanitizeString(userAgent, 1000),
        referrer: sanitizeString(referrer, 500),
        ipHash: hashIp(ip),
        clickedAt: new Date().toISOString(),
      };

      assignRelation(data, 'page', sanitizeId(payload.pageId));
      assignRelation(data, 'product', sanitizeId(payload.productId));
      assignRelation(data, 'affiliateLink', sanitizeId(payload.affiliateLinkId));
      assignRelation(data, 'marketplace', sanitizeId(payload.marketplaceId));

      await strapi.db.query('api::click-event.click-event').create({ data });
    } catch (error) {
      strapi.log.warn(`Public click event was not persisted: ${error.message}`);
    }

    return { success: true };
  },

  async findPageBySlugs(categorySlug, contentSlug) {
    if (!isValidSlug(categorySlug) || !isValidSlug(contentSlug)) {
      return null;
    }

    const page = await strapi.db.query('api::page.page').findOne({
      where: {
        slug: contentSlug,
        status: 'published',
        category: {
          slug: categorySlug,
        },
      },
      populate: {
        featuredImage: true,
        category: true,
        subCategory: true,
        seo: {
          populate: {
            ogImage: true,
          },
        },
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
        faqs: true,
        relatedPages: {
          populate: {
            category: true,
          },
        },
      },
    });

    if (!page || page.category?.slug !== categorySlug) {
      return null;
    }

    const dynamicRelatedPages = await getRelatedPages(strapi, {
      pageId: page.id,
      limit: 8,
    });

    return serializePage(page, dynamicRelatedPages);
  },
});
