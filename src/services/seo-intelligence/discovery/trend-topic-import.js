'use strict';

const { persistEditorialTopics } = require('../topic-persist');
const { discoverSearchDemand } = require('./search-demand-engine');
const { expandTrendKeyword } = require('./trend-topic-expander');

const DEFAULT_MAX_RESULTS = 20;

const dedupeTopics = (topics) => {
  const byNormalizedKeyword = new Map();

  for (const topic of topics) {
    const existing = byNormalizedKeyword.get(topic.normalizedKeyword);

    if (!existing || topic.priority > existing.priority) {
      byNormalizedKeyword.set(topic.normalizedKeyword, topic);
    }
  }

  return [...byNormalizedKeyword.values()];
};

const importTrendTopics = async ({
  baseTerm,
  maxResults = DEFAULT_MAX_RESULTS,
  strapi,
  ...discoveryOptions
} = {}) => {
  const demand = await discoverSearchDemand({
    term: baseTerm,
    maxResults,
    ...discoveryOptions,
  });
  const warnings = [];
  const expandedTopics = [];

  for (const opportunity of demand.opportunities) {
    const topics = expandTrendKeyword({
      baseTerm: demand.term,
      trendKeyword: opportunity.keyword,
      trendScore: opportunity.trendScore,
      source: demand.source,
    });

    if (!topics.length) {
      warnings.push({
        code: 'trend_keyword_discarded',
        keyword: opportunity.keyword,
        reason: 'Keyword is too generic or has insufficient context for safe expansion',
      });
      continue;
    }

    expandedTopics.push(...topics);
  }

  const topics = dedupeTopics(expandedTopics);
  const persistence = await persistEditorialTopics({
    strapi,
    topics,
    sourceTerm: demand.term,
    sourceMarketplace: demand.source,
  });

  return {
    baseTerm: demand.term,
    source: demand.source,
    discovered: demand.opportunities.length,
    expanded: topics.length,
    discarded: warnings.length,
    warnings,
    persistence,
  };
};

module.exports = {
  importTrendTopics,
};
