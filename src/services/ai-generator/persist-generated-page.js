'use strict';

const uid = {
  ranking: 'api::ranking.ranking',
  page: 'api::page.page',
  seo: 'api::seo.seo',
  faq: 'api::faq.faq',
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

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const getPage = (strapi, id) => {
  return query(strapi, uid.page).findOne({
    where: { id },
    populate: ['seo', 'faqs', 'ranking'],
  });
};

const findPageBySlug = (strapi, slug) => {
  return query(strapi, uid.page).findOne({
    where: { slug },
    populate: ['ranking'],
  });
};

const getUniqueDraftSlug = async (strapi, baseSlug, rankingId, existingPageId) => {
  const candidates = [
    baseSlug,
    `${baseSlug}-${rankingId}`,
    `${baseSlug}-draft-${rankingId}`,
  ];

  for (const candidate of candidates) {
    const existing = await findPageBySlug(strapi, candidate);

    if (!existing || existing.id === existingPageId || existing.ranking?.id === rankingId) {
      return candidate;
    }
  }

  throw new Error('Could not generate a unique draft page slug');
};

const buildCanonicalUrl = (category, slug) => {
  return category?.slug ? `/${category.slug}/${slug}` : `/${slug}`;
};

const getEditorialProductCount = (rankingContext) => {
  return rankingContext.editorialPlan?.productCount || rankingContext.products?.length || 0;
};

const buildSchemaData = (rankingContext, pageSlug, generatedContent) => {
  const categorySlug = rankingContext.category?.slug || null;
  const itemListElement = rankingContext.products
    .slice(0, getEditorialProductCount(rankingContext))
    .map((item) => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.product?.name || item.title,
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: generatedContent.title || rankingContext.editorialPlan?.titleHint || rankingContext.ranking.title,
    url: categorySlug ? `/${categorySlug}/${pageSlug}` : `/${pageSlug}`,
    numberOfItems: itemListElement.length,
    itemListElement,
  };
};

const upsertPage = async (strapi, rankingContext, generatedContent) => {
  const existingPage = rankingContext.ranking.existingPage
    ? await getPage(strapi, rankingContext.ranking.existingPage.id)
    : null;

  if (existingPage?.status === 'published') {
    throw new Error('Ranking already has a published Page. AI Generator cannot overwrite it.');
  }

  const baseSlug = slugify(
    rankingContext.editorialPlan?.slugHint ||
      generatedContent.title ||
      rankingContext.ranking.slug ||
      rankingContext.ranking.title
  );
  const slug = await getUniqueDraftSlug(
    strapi,
    baseSlug,
    rankingContext.ranking.id,
    existingPage?.id
  );
  const canonicalUrl = buildCanonicalUrl(rankingContext.category, slug);
  const data = {
    title: generatedContent.title,
    slug,
    pageType: 'ranking',
    status: 'draft',
    excerpt: generatedContent.excerpt,
    intro: generatedContent.introduction,
    conclusion: generatedContent.conclusion,
    canonicalUrl,
    approvedAt: null,
    publishedAt: null,
    category: rankingContext.category?.id || null,
    subCategory: rankingContext.subCategory?.id || null,
  };
  const page = existingPage
    ? await query(strapi, uid.page).update({
        where: { id: existingPage.id },
        data,
      })
    : await query(strapi, uid.page).create({ data });

  await query(strapi, uid.ranking).update({
    where: { id: rankingContext.ranking.id },
    data: {
      page: page.id,
    },
  });

  return getPage(strapi, page.id);
};

const upsertSeo = async (strapi, page, rankingContext, generatedContent) => {
  const seoData = {
    metaTitle: generatedContent.seo.metaTitle,
    metaDescription: generatedContent.seo.metaDescription,
    canonicalUrl: page.canonicalUrl,
    ogTitle: generatedContent.seo.metaTitle,
    ogDescription: generatedContent.seo.metaDescription,
    robots: 'indexFollow',
    status: 'draft',
    approvedAt: null,
    schemaType: 'itemList',
    schemaData: buildSchemaData(rankingContext, page.slug, generatedContent),
    focusKeyword: generatedContent.seo.focusKeyword,
    secondaryKeywords: generatedContent.seo.secondaryKeywords || [],
  };
  const seo = page.seo
    ? await query(strapi, uid.seo).update({
        where: { id: page.seo.id },
        data: seoData,
      })
    : await query(strapi, uid.seo).create({
        data: seoData,
      });

  await query(strapi, uid.page).update({
    where: { id: page.id },
    data: {
      seo: seo.id,
    },
  });

  return seo;
};

const upsertFaqs = async (strapi, page, generatedContent) => {
  const existingFaqs = [...(page.faqs || [])]
    .filter((faq) => faq.generatedByAi)
    .sort((first, second) => (first.order || 0) - (second.order || 0));
  const faqIds = [];

  for (const [index, faq] of generatedContent.faqs.entries()) {
    const data = {
      question: faq.question,
      answer: faq.answer,
      order: index + 1,
      status: 'active',
      generatedByAi: true,
      approvedAt: null,
      page: page.id,
    };
    const existing = existingFaqs[index];
    const persistedFaq = existing
      ? await query(strapi, uid.faq).update({
          where: { id: existing.id },
          data,
        })
      : await query(strapi, uid.faq).create({
          data,
        });

    faqIds.push(persistedFaq.id);
  }

  for (const extraFaq of existingFaqs.slice(generatedContent.faqs.length)) {
    await query(strapi, uid.faq).update({
      where: { id: extraFaq.id },
      data: {
        status: 'inactive',
        approvedAt: null,
      },
    });
  }

  return faqIds;
};

const persistGeneratedPage = async (strapi, rankingContext, generatedContent) => {
  const page = await upsertPage(strapi, rankingContext, generatedContent);
  const seo = await upsertSeo(strapi, page, rankingContext, generatedContent);
  const faqIds = await upsertFaqs(strapi, page, generatedContent);

  return {
    pageId: page.id,
    seoId: seo.id,
    faqIds,
  };
};

module.exports = {
  persistGeneratedPage,
};
