'use strict';

const { buildRankingContext } = require('./build-ranking-context');
const { generatePageContent } = require('./generate-page-content');
const { persistGeneratedPage } = require('./persist-generated-page');
const { getModel } = require('./openai-client');

const uid = {
  aiGenerationLog: 'api::ai-generation-log.ai-generation-log',
};

const parseId = (value) => {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const truncateText = (value = '', maxLength = 3000) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
};

const getUsageValue = (usage, key) => {
  const value = usage?.[key];

  return Number.isInteger(value) ? value : null;
};

const createAiGenerationLog = async (strapi, data) => {
  return strapi.db.query(uid.aiGenerationLog).create({
    data: {
      provider: 'openai',
      model: data.model || getModel(),
      promptType: 'ranking',
      prompt: truncateText(data.prompt),
      inputData: data.inputData || null,
      outputData: data.outputData || null,
      status: data.status,
      errorMessage: data.errorMessage || null,
      tokensInput: getUsageValue(data.usage, 'input_tokens'),
      tokensOutput: getUsageValue(data.usage, 'output_tokens'),
      costEstimate: null,
      generatedAt: new Date().toISOString(),
      page: data.pageId || null,
      ranking: data.rankingId || null,
    },
  });
};

const generatePageFromRanking = async (strapi, payload = {}) => {
  const rankingId = parseId(payload.rankingId);

  if (!rankingId) {
    throw new Error('rankingId is required');
  }

  let rankingContext = null;

  try {
    rankingContext = await buildRankingContext(strapi, rankingId, {
      commandContext: payload.commandContext,
      editorialPlan: payload.editorialPlan,
    });

    if (rankingContext.ranking.existingPage?.status === 'published') {
      throw new Error('Ranking already has a published Page. AI Generator cannot overwrite it.');
    }

    const generated = await generatePageContent(rankingContext);
    const persisted = await persistGeneratedPage(strapi, rankingContext, generated.data);
    const log = await createAiGenerationLog(strapi, {
      model: generated.model,
      prompt: generated.prompt.user,
      inputData: {
        ranking: rankingContext.ranking,
        source: rankingContext.source || null,
        commandContext: rankingContext.commandContext || null,
        editorialPlan: rankingContext.editorialPlan || null,
        category: rankingContext.category,
        subCategory: rankingContext.subCategory,
        products: rankingContext.products,
      },
      outputData: {
        responseId: generated.responseId,
        content: generated.data,
      },
      status: 'success',
      usage: generated.usage,
      rankingId,
      pageId: persisted.pageId,
    });

    return {
      success: true,
      pageId: persisted.pageId,
      seoId: persisted.seoId,
      faqIds: persisted.faqIds,
      aiGenerationLogId: log.id,
    };
  } catch (error) {
    await createAiGenerationLog(strapi, {
      model: getModel(),
      prompt: rankingContext || { rankingId },
      inputData: rankingContext || { rankingId },
      outputData: null,
      status: 'failed',
      errorMessage: error.message,
      rankingId,
      pageId: null,
    }).catch((logError) => {
      strapi.log.warn(`[AI Generator] Failed to write failure log: ${logError.message}`);
    });

    throw error;
  }
};

module.exports = {
  generatePageFromRanking,
};
