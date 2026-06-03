'use strict';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isValidSlug = (value) => {
  return typeof value === 'string' && SLUG_PATTERN.test(value);
};

const sortByOrder = (items = []) => {
  return [...items].sort((a, b) => {
    const first = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
    const second = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;

    return first - second;
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
    id: page.id,
    title: page.title,
    slug: page.slug,
    categorySlug,
    url: categorySlug ? `/${categorySlug}/${page.slug}` : null,
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

const serializePage = (page) => {
  const activeFaqs = (page.faqs || []).filter((faq) => faq.status === 'active');
  const publishedRelatedPages = (page.relatedPages || []).filter(
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

module.exports = () => ({
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

    return serializePage(page);
  },
});
