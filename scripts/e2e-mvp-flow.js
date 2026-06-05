'use strict';

require('dotenv').config();

const net = require('node:net');
const { createStrapi } = require('@strapi/strapi');
const { searchProducts } = require('../src/services/marketplaces/mercado-livre/search');
const { importProducts } = require('../src/services/marketplaces/mercado-livre/import-products');
const rankingBuilder = require('../src/services/ranking-builder');
const aiGenerator = require('../src/services/ai-generator');
const publicationWorkflow = require('../src/services/publication-workflow');

const E2E_MARKER = 'Texto revisado automaticamente pelo fluxo E2E.';
const SEARCH_QUERY = 'serra marmore';
const SEARCH_LIMIT = 8;
const REQUIRED_PRODUCTS = 3;
const RANKING_TITLE = 'Top 10 Serras Mármore E2E';
const RANKING_SLUG = 'top-10-serras-marmore-e2e';
const CATEGORY_DATA = {
  name: 'Construção',
  slug: 'construcao',
  description: 'Guias, rankings e comparativos de construção.',
  status: 'active',
};
const SUB_CATEGORY_DATA = {
  name: 'Ferramentas elétricas',
  slug: 'ferramentas-eletricas',
  description: 'Ferramentas elétricas para construção, reforma e manutenção.',
  status: 'active',
};

const uid = {
  category: 'api::category.category',
  subCategory: 'api::sub-category.sub-category',
  ranking: 'api::ranking.ranking',
  page: 'api::page.page',
};

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });
};

const findAvailablePort = async (startPort = 1340) => {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`Could not find an available port starting at ${startPort}`);
};

const configureE2EPort = async () => {
  if (process.env.E2E_PUBLIC_BASE_URL) {
    return;
  }

  const preferredPort = Number(process.env.E2E_PORT || 1340);
  const port = await findAvailablePort(Number.isInteger(preferredPort) ? preferredPort : 1340);

  process.env.PORT = String(port);
};

const logOk = (message, details) => {
  console.log(`✅ ${message}${details ? ` ${details}` : ''}`);
};

const failWithContext = (message, error) => {
  const reason = error?.message || String(error);

  throw new Error(`${message}: ${reason}`);
};

const upsertCategory = async (strapi) => {
  const existing = await query(strapi, uid.category).findOne({
    where: { slug: CATEGORY_DATA.slug },
  });

  if (existing) {
    return query(strapi, uid.category).update({
      where: { id: existing.id },
      data: CATEGORY_DATA,
    });
  }

  return query(strapi, uid.category).create({
    data: CATEGORY_DATA,
  });
};

const upsertSubCategory = async (strapi, category) => {
  const data = {
    ...SUB_CATEGORY_DATA,
    category: category.id,
  };
  const existing = await query(strapi, uid.subCategory).findOne({
    where: { slug: SUB_CATEGORY_DATA.slug },
  });

  if (existing) {
    return query(strapi, uid.subCategory).update({
      where: { id: existing.id },
      data,
    });
  }

  return query(strapi, uid.subCategory).create({ data });
};

const getExistingRanking = async (strapi) => {
  return query(strapi, uid.ranking).findOne({
    where: { slug: RANKING_SLUG },
    populate: {
      page: {
        populate: ['category'],
      },
      items: {
        populate: ['product', 'affiliateLink'],
      },
    },
  });
};

const getPageForPublicUrl = async (strapi, pageId) => {
  return query(strapi, uid.page).findOne({
    where: { id: pageId },
    populate: ['category'],
  });
};

const selectProductsForRanking = (importedProducts) => {
  return importedProducts.slice(0, REQUIRED_PRODUCTS).map((product, index) => ({
    productId: product.id,
    position: index + 1,
    title: product.name,
    summary: `Produto validado no fluxo E2E para ${RANKING_TITLE}.`,
    pros: ['Importado pelo Mercado Livre', 'Validado no fluxo E2E'],
    cons: ['Revisao editorial automatizada de teste'],
    highlight: index === 0 ? 'Destaque do fluxo E2E' : null,
    score: Number((9 - index * 0.2).toFixed(1)),
    ctaText: 'Ver no Mercado Livre',
  }));
};

const createOrUpdateRanking = async ({ strapi, category, subCategory, importedProducts }) => {
  const existing = await getExistingRanking(strapi);
  const publishedPage = existing?.page?.status === 'published' ? existing.page : null;

  if (publishedPage) {
    return rankingBuilder.getRanking(strapi, existing.id);
  }

  const payload = {
    title: RANKING_TITLE,
    slug: RANKING_SLUG,
    description: `Ranking criado pelo fluxo E2E MVP. ${E2E_MARKER}`,
    rankingType: 'top10',
    status: 'draft',
    categoryId: category.id,
    subCategoryId: subCategory.id,
    products: selectProductsForRanking(importedProducts),
  };

  if (existing?.id) {
    return rankingBuilder.updateRanking(strapi, existing.id, payload);
  }

  return rankingBuilder.createRanking(strapi, payload);
};

const getGeneratedOrExistingPage = async (strapi, ranking) => {
  if (ranking.pageId) {
    const existingPage = await getPageForPublicUrl(strapi, ranking.pageId);

    if (existingPage?.status === 'published') {
      return {
        pageId: existingPage.id,
        reusedPublishedPage: true,
      };
    }
  }

  try {
    return {
      ...(await aiGenerator.generatePageFromRanking(strapi, { rankingId: ranking.id })),
      reusedPublishedPage: false,
    };
  } catch (error) {
    failWithContext('AI Generator failed. Check OpenAI configuration and model access', error);
  }
};

const reviseDraft = async (strapi, pageId) => {
  const page = await publicationWorkflow.getPage(strapi, pageId);

  if (page.status === 'published') {
    return page;
  }

  const activeFaqs = (page.faqs || []).filter((faq) => faq.status === 'active');
  const revisedFaqs = activeFaqs.map((faq, index) => ({
    id: faq.id,
    question: faq.question,
    answer: `${faq.answer}\n\n${E2E_MARKER}`,
    order: index + 1,
    status: 'active',
  }));

  return publicationWorkflow.updatePage(strapi, pageId, {
    title: page.title,
    excerpt: `${page.excerpt || ''}\n\n${E2E_MARKER}`.trim(),
    introduction: `${page.intro || page.introduction || ''}\n\n${E2E_MARKER}`.trim(),
    summary: `${page.summary || page.excerpt || ''}\n\n${E2E_MARKER}`.trim(),
    conclusion: `${page.conclusion || ''}\n\n${E2E_MARKER}`.trim(),
    seo: {
      metaTitle: page.seo?.metaTitle || page.title,
      metaDescription: `${page.seo?.metaDescription || page.excerpt || page.title} ${E2E_MARKER}`,
      focusKeyword: page.seo?.focusKeyword || SEARCH_QUERY,
      secondaryKeywords: page.seo?.secondaryKeywords || [SEARCH_QUERY, 'ranking e2e'],
      robots: page.seo?.robots || 'indexFollow',
    },
    faqs: revisedFaqs,
  });
};

const approveAndPublish = async (strapi, pageId) => {
  let page = await publicationWorkflow.getPage(strapi, pageId);

  if (page.status === 'published') {
    logOk('Page approved OK', `(already published pageId=${page.id})`);
    return page;
  }

  page = await publicationWorkflow.approvePage(strapi, pageId);
  logOk('Page approved OK', `(pageId=${page.id})`);

  page = await publicationWorkflow.publishPage(strapi, pageId);

  return page;
};

const getPublicBaseUrl = (strapi) => {
  const port = strapi.config.get('server.port', process.env.PORT || 1337);

  return `http://localhost:${port}`;
};

const ensureHttpServer = async (strapi) => {
  if (process.env.E2E_PUBLIC_BASE_URL) {
    return false;
  }

  if (strapi.server.httpServer?.listening) {
    return false;
  }

  await strapi.listen();

  return true;
};

const assertPublicEndpoint = async (strapi, page) => {
  const publicPage = await getPageForPublicUrl(strapi, page.id);
  const categorySlug = publicPage?.category?.slug;

  if (!categorySlug || !publicPage?.slug) {
    throw new Error('Published Page is missing category slug or page slug');
  }

  const baseUrl = getPublicBaseUrl(strapi);
  const url = `${
    process.env.E2E_PUBLIC_BASE_URL
      ? process.env.E2E_PUBLIC_BASE_URL.replace(/\/$/, '')
      : baseUrl
  }/api/public/pages/${categorySlug}/${publicPage.slug}`;
  await ensureHttpServer(strapi);
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (response.status !== 200) {
    const text = await response.text();

    throw new Error(`Public endpoint returned ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = await response.json();

  return {
    url,
    page: data,
  };
};

const run = async () => {
  await configureE2EPort();

  const strapi = await createStrapi().load();
  const result = {
    productIds: [],
    rankingId: null,
    pageId: null,
    publicUrl: null,
  };

  try {
    const category = await upsertCategory(strapi);
    const subCategory = await upsertSubCategory(strapi, category);
    let searchResult;

    try {
      searchResult = await searchProducts({
        query: SEARCH_QUERY,
        limit: SEARCH_LIMIT,
      }, {
        logger: strapi.log,
      });
    } catch (error) {
      failWithContext('Mercado Livre search failed', error);
    }

    if (!Array.isArray(searchResult.products) || searchResult.products.length < REQUIRED_PRODUCTS) {
      throw new Error(
        `Mercado Livre search returned ${searchResult.products?.length || 0} product(s); ${REQUIRED_PRODUCTS} required`
      );
    }

    logOk('Mercado Livre search OK', `(source=${searchResult.source}, count=${searchResult.count})`);

    let importResult;

    try {
      importResult = await importProducts(strapi, {
        categoryId: category.id,
        subCategoryId: subCategory.id,
        products: searchResult.products.slice(0, REQUIRED_PRODUCTS),
      });
    } catch (error) {
      failWithContext('Products import failed', error);
    }

    if (!Array.isArray(importResult.products) || importResult.products.length < REQUIRED_PRODUCTS) {
      throw new Error(
        `Products import returned ${importResult.products?.length || 0} product(s); ${REQUIRED_PRODUCTS} required`
      );
    }

    result.productIds = importResult.products.map((product) => product.id);
    logOk('Products imported OK', `(productIds=${result.productIds.join(',')})`);

    const ranking = await createOrUpdateRanking({
      strapi,
      category,
      subCategory,
      importedProducts: importResult.products,
    });

    result.rankingId = ranking.id;
    logOk('Ranking created OK', `(rankingId=${ranking.id})`);

    const generated = await getGeneratedOrExistingPage(strapi, ranking);

    result.pageId = generated.pageId;
    logOk(
      'AI page generated OK',
      generated.reusedPublishedPage ? `(reused published pageId=${generated.pageId})` : `(pageId=${generated.pageId})`
    );

    const revisedPage = await reviseDraft(strapi, generated.pageId);

    logOk('Publication draft updated OK', `(pageId=${revisedPage.id})`);

    const publishedPage = await approveAndPublish(strapi, generated.pageId);

    result.pageId = publishedPage.id;
    logOk('Page published OK', `(pageId=${publishedPage.id})`);

    const publicResult = await assertPublicEndpoint(strapi, publishedPage);

    result.publicUrl = publicResult.url;
    logOk('Public endpoint OK', `(url=${publicResult.url})`);

    console.log(
      JSON.stringify(
        {
          success: true,
          ...result,
        },
        null,
        2
      )
    );
  } finally {
    await strapi.destroy();
  }
};

run().catch((error) => {
  console.error(`E2E MVP flow failed: ${error.message}`);
  process.exit(1);
});
