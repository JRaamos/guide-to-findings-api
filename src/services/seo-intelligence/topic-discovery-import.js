'use strict';

const {
  discoverKeywords,
} = require('./keyword-discovery');
const {
  persistEditorialTopics,
} = require('./topic-persist');
const {
  refreshTopicScores,
} = require('./topic-score-refresh');
const {
  importTrendTopics,
} = require('./discovery/trend-topic-import');

const VALID_SOURCES = new Set(['templates', 'trends', 'both']);
const GOOGLE_TRENDS_RATE_LIMIT_WARNING =
  'Google Trends limitou temporariamente as requisicoes. Tente novamente depois.';

const sanitizeText = (value) => {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
};

const isGoogleTrendsRateLimit = (error) => {
  return error?.status === 429 || /rate limit|429/i.test(error?.message || '');
};

const createResult = ({ term, source }) => ({
  success: true,
  term,
  source,
  created: 0,
  updated: 0,
  skipped: 0,
  scored: 0,
  topics: [],
  warnings: [],
});

const mergePersistenceResult = (result, persistence) => {
  result.created += Number(persistence?.created) || 0;
  result.updated += Number(persistence?.updated) || 0;
  result.skipped += Number(persistence?.skipped) || 0;

  for (const topic of persistence?.topics || []) {
    const existingIndex = result.topics.findIndex((item) => item.id === topic.id);

    if (existingIndex >= 0) {
      result.topics[existingIndex] = topic;
    } else {
      result.topics.push(topic);
    }
  }
};

const importTemplateTopics = async ({ strapi, term }) => {
  const topics = discoverKeywords({ term });

  return persistEditorialTopics({
    strapi,
    topics,
    sourceTerm: term,
    sourceMarketplace: 'mercadoLivre',
  });
};

const importGoogleTrendTopics = async ({ strapi, term }) => {
  const trendResult = await importTrendTopics({
    strapi,
    baseTerm: term,
  });

  return {
    persistence: trendResult.persistence,
    warnings: trendResult.warnings || [],
  };
};

const addScoringData = (result, scoreResult) => {
  const scoresById = new Map((scoreResult?.topics || []).map((topic) => [topic.id, topic]));

  result.scored = Number(scoreResult?.processed) || 0;
  result.topics = result.topics.map((topic) => {
    const score = scoresById.get(topic.id);

    return {
      ...topic,
      topicScore: score?.score ?? null,
      topicScoreBreakdown: score?.breakdown || null,
    };
  });
};

const discoverAndImportTopics = async (
  strapi,
  { term, source = 'both' } = {}
) => {
  if (!strapi?.db?.query) {
    throw new Error('A Strapi instance is required to discover editorial topics');
  }

  const normalizedTerm = sanitizeText(term);
  const normalizedSource = sanitizeText(source).toLowerCase();

  if (!normalizedTerm) {
    throw new Error('term is required');
  }

  if (!VALID_SOURCES.has(normalizedSource)) {
    throw new Error('source must be templates, trends or both');
  }

  const result = createResult({
    term: normalizedTerm,
    source: normalizedSource,
  });

  if (normalizedSource === 'templates' || normalizedSource === 'both') {
    const persistence = await importTemplateTopics({
      strapi,
      term: normalizedTerm,
    });

    mergePersistenceResult(result, persistence);
  }

  if (normalizedSource === 'trends' || normalizedSource === 'both') {
    try {
      const trendImport = await importGoogleTrendTopics({
        strapi,
        term: normalizedTerm,
      });

      mergePersistenceResult(result, trendImport.persistence);
      result.warnings.push(...trendImport.warnings);
    } catch (error) {
      if (!isGoogleTrendsRateLimit(error)) {
        throw error;
      }

      result.warnings.push({
        code: 'google_trends_rate_limited',
        status: 429,
        message: GOOGLE_TRENDS_RATE_LIMIT_WARNING,
      });
    }
  }

  if (result.topics.length > 0) {
    addScoringData(result, await refreshTopicScores(strapi));
  }

  return result;
};

module.exports = {
  GOOGLE_TRENDS_RATE_LIMIT_WARNING,
  discoverAndImportTopics,
};
