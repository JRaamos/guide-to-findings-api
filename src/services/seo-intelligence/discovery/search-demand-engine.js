'use strict';

const { discoverGoogleTrends } = require('./google-trends');

const DEFAULT_MAX_RESULTS = 20;
const MAX_RESULTS = 100;

const DISCOVERY_SOURCES = {
  google_trends: discoverGoogleTrends,
};

const normalizeKeyword = (keyword = '') => {
  return keyword
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeLimit = (value) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_MAX_RESULTS;
  }

  return Math.min(parsed, MAX_RESULTS);
};

const scoreSignals = (signals = []) => {
  const highestRisingValue = Math.max(
    0,
    ...signals.filter((signal) => signal.trendType === 'rising').map((signal) => signal.value)
  );

  return signals.map((signal) => ({
    keyword: signal.keyword,
    trendScore: signal.trendType === 'rising' && highestRisingValue > 0
      ? Math.round((signal.value / highestRisingValue) * 100)
      : Math.max(0, Math.min(100, Math.round(signal.value))),
  }));
};

const dedupeOpportunities = (opportunities) => {
  const byKeyword = new Map();

  for (const opportunity of opportunities) {
    const normalizedKeyword = normalizeKeyword(opportunity.keyword);

    if (!normalizedKeyword) {
      continue;
    }

    const existing = byKeyword.get(normalizedKeyword);

    if (!existing || opportunity.trendScore > existing.trendScore) {
      byKeyword.set(normalizedKeyword, opportunity);
    }
  }

  return [...byKeyword.values()].sort((left, right) => {
    return right.trendScore - left.trendScore || left.keyword.localeCompare(right.keyword, 'pt-BR');
  });
};

const discoverSearchDemand = async ({
  term,
  sources = ['google_trends'],
  maxResults = DEFAULT_MAX_RESULTS,
  ...sourceOptions
} = {}) => {
  const normalizedSources = Array.isArray(sources) ? sources : [sources];
  const unsupportedSources = normalizedSources.filter((source) => !DISCOVERY_SOURCES[source]);

  if (unsupportedSources.length) {
    throw new Error(`Unsupported discovery sources: ${unsupportedSources.join(', ')}`);
  }

  const results = await Promise.all(
    normalizedSources.map((source) => DISCOVERY_SOURCES[source]({ term, ...sourceOptions }))
  );
  const opportunities = dedupeOpportunities(
    results.flatMap((result) => scoreSignals(result.signals))
  ).slice(0, normalizeLimit(maxResults));

  return {
    term: results[0]?.term || term,
    source: normalizedSources.length === 1 ? normalizedSources[0] : 'multiple',
    opportunities,
  };
};

module.exports = {
  DISCOVERY_SOURCES,
  discoverSearchDemand,
};
