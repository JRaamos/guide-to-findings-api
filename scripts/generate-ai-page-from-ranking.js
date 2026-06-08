'use strict';

require('dotenv').config();

const { createStrapi } = require('@strapi/strapi');
const {
  generatePageFromRanking,
} = require('../src/services/ai-generator');

const DEFAULT_RANKING_ID = 11;

const uid = {
  ranking: 'api::ranking.ranking',
  rankingItem: 'api::ranking-item.ranking-item',
  page: 'api::page.page',
  seo: 'api::seo.seo',
  faq: 'api::faq.faq',
  aiGenerationLog: 'api::ai-generation-log.ai-generation-log',
};

const getRankingId = () => {
  const value = Number(process.argv[2] || DEFAULT_RANKING_ID);

  return Number.isInteger(value) && value > 0 ? value : DEFAULT_RANKING_ID;
};

const countRecords = (strapi, modelUid) => {
  return strapi.db.query(modelUid).count();
};

const countModels = async (strapi) => ({
  rankings: await countRecords(strapi, uid.ranking),
  rankingItems: await countRecords(strapi, uid.rankingItem),
  pages: await countRecords(strapi, uid.page),
  seos: await countRecords(strapi, uid.seo),
  faqs: await countRecords(strapi, uid.faq),
  aiGenerationLogs: await countRecords(strapi, uid.aiGenerationLog),
});

const getPage = (strapi, id) => {
  return strapi.db.query(uid.page).findOne({
    where: {
      id,
    },
    populate: ['category', 'seo', 'faqs', 'ranking'],
  });
};

const getAiGenerationLog = (strapi, id) => {
  return strapi.db.query(uid.aiGenerationLog).findOne({
    where: {
      id,
    },
  });
};

const buildPublicEndpointCheck = async (strapi, page) => {
  if (!page?.category?.slug) {
    return {
      checked: false,
      expectedStatus: 404,
      reason: 'page has no public category slug while still draft',
    };
  }

  const publicService = strapi.service('api::public.public');
  const publicPage = await publicService.findPageBySlugs(page.category.slug, page.slug);

  return {
    checked: true,
    path: `/api/public/pages/${page.category.slug}/${page.slug}`,
    expectedStatus: 404,
    returnedPage: Boolean(publicPage),
  };
};

const containsMarketplaceSource = (page) => {
  const text = [
    page.title,
    page.excerpt,
    page.intro,
    page.conclusion,
    page.seo?.metaTitle,
    page.seo?.metaDescription,
    ...(page.faqs || []).flatMap((faq) => [faq.question, faq.answer]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return text.includes('mercado livre') || text.includes('mais vendidos');
};

const main = async () => {
  const rankingId = getRankingId();
  const app = await createStrapi().load();

  try {
    const beforeCounts = await countModels(app);
    const result = await generatePageFromRanking(app, {
      rankingId,
    });
    const afterCounts = await countModels(app);
    const page = await getPage(app, result.pageId);
    const log = await getAiGenerationLog(app, result.aiGenerationLogId);
    const publicEndpointCheck = await buildPublicEndpointCheck(app, page);

    console.log(
      JSON.stringify(
        {
          success: result.success,
          rankingId,
          pageId: result.pageId,
          seoId: result.seoId,
          faqIds: result.faqIds,
          aiGenerationLogId: result.aiGenerationLogId,
          page: {
            id: page.id,
            title: page.title,
            slug: page.slug,
            status: page.status,
            pageType: page.pageType,
            categorySlug: page.category?.slug || null,
            seoId: page.seo?.id || null,
            faqCount: page.faqs?.length || 0,
            rankingId: page.ranking?.id || null,
            mentionsMarketplaceSource: containsMarketplaceSource(page),
          },
          aiGenerationLog: {
            id: log.id,
            status: log.status,
            provider: log.provider,
            model: log.model,
            pageId: page.id,
            rankingId,
          },
          publicEndpointCheck,
          modelCounts: {
            before: beforeCounts,
            after: afterCounts,
            rankingUnchanged: beforeCounts.rankings === afterCounts.rankings,
            rankingItemUnchanged: beforeCounts.rankingItems === afterCounts.rankingItems,
            noPublishedPageCreated: page.status !== 'published',
          },
        },
        null,
        2
      )
    );
  } finally {
    await app.destroy();
  }
};

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: error.message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
