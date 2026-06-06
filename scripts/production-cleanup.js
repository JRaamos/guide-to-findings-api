'use strict';

require('dotenv').config();

const { createStrapi } = require('@strapi/strapi');

const TEST_CONTENT_PATTERN =
  /e2e|validation|validacao|validação|teste|test|publication-workflow|workflow-v2|2024/i;
const NO_INDEX_ROBOTS = 'noIndexNoFollow';
const ARCHIVED_STATUS = 'archived';

const PRESERVED_PUBLIC_PAGE_SLUGS = new Set(['top-10-serras-marmore']);
const KNOWN_LOCAL_VALIDATION_SLUGS = new Set([
  'ranking-das-melhores-serras-marmore-para-construcao',
  'top-10-serras-marmore-2',
  'top-3-serras-marmore-para-uso-profissional-e-domestico',
  'top-3-serras-marmore-para-uso-profissional-e-custo-beneficio',
]);

const uid = {
  page: 'api::page.page',
  seo: 'api::seo.seo',
  aiGenerationLog: 'api::ai-generation-log.ai-generation-log',
};

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const getAiLogPageIds = async (strapi) => {
  const logs = await query(strapi, uid.aiGenerationLog).findMany({
    where: { status: 'success' },
    populate: ['page'],
    limit: 1000,
  });

  return new Set(logs.map((log) => log.page?.id).filter(Boolean));
};

const getCandidateReasons = (page, aiLogPageIds) => {
  if (PRESERVED_PUBLIC_PAGE_SLUGS.has(page.slug)) {
    return [];
  }

  const rankingTitle = page.ranking?.title || '';
  const searchableText = [page.title, page.slug, rankingTitle].filter(Boolean).join(' ');
  const reasons = [];

  if (TEST_CONTENT_PATTERN.test(searchableText)) {
    reasons.push('test-marker');
  }

  if (KNOWN_LOCAL_VALIDATION_SLUGS.has(page.slug)) {
    reasons.push('known-local-validation-slug');
  }

  if (aiLogPageIds.has(page.id) && KNOWN_LOCAL_VALIDATION_SLUGS.has(page.slug)) {
    reasons.push('ai-generated-validation-page');
  }

  return [...new Set(reasons)];
};

const archivePage = async (strapi, page, reasons) => {
  const alreadyArchived = page.status === ARCHIVED_STATUS;
  const alreadyNoIndex = page.seo?.robots === NO_INDEX_ROBOTS;
  const actions = [];

  if (!alreadyArchived) {
    await query(strapi, uid.page).update({
      where: { id: page.id },
      data: {
        status: ARCHIVED_STATUS,
      },
    });
    actions.push(`Page.status=${ARCHIVED_STATUS}`);
  }

  if (page.seo?.id && !alreadyNoIndex) {
    await query(strapi, uid.seo).update({
      where: { id: page.seo.id },
      data: {
        robots: NO_INDEX_ROBOTS,
      },
    });
    actions.push(`Seo.robots=${NO_INDEX_ROBOTS}`);
  }

  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    previousStatus: page.status,
    previousRobots: page.seo?.robots || null,
    reasons,
    action: actions.length ? actions.join(', ') : 'already-clean',
  };
};

const run = async () => {
  const strapi = await createStrapi().load();

  try {
    const aiLogPageIds = await getAiLogPageIds(strapi);
    const pages = await query(strapi, uid.page).findMany({
      where: {
        status: {
          $in: ['published', ARCHIVED_STATUS],
        },
      },
      populate: {
        category: true,
        seo: true,
        ranking: true,
      },
      orderBy: {
        id: 'asc',
      },
      limit: 1000,
    });
    const preserved = [];
    const cleaned = [];

    for (const page of pages) {
      if (PRESERVED_PUBLIC_PAGE_SLUGS.has(page.slug)) {
        preserved.push({
          id: page.id,
          title: page.title,
          slug: page.slug,
          status: page.status,
        });
        continue;
      }

      const reasons = getCandidateReasons(page, aiLogPageIds);

      if (!reasons.length) {
        continue;
      }

      cleaned.push(await archivePage(strapi, page, reasons));
    }

    console.log(JSON.stringify(
      {
        success: true,
        cleanedCount: cleaned.length,
        preserved,
        cleaned,
      },
      null,
      2
    ));
  } finally {
    await strapi.destroy();
  }
};

run().catch((error) => {
  console.error(`Production cleanup failed: ${error.message}`);
  process.exit(1);
});
