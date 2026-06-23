'use strict';

const {
  getPageClusterKey,
  getTopicClusterKey,
} = require('./topic-clusters');
const {
  normalizeKeyText,
  singularizeEditorialTerm,
} = require('../editorial-intelligence/editorial-key');

const COVERAGE_INTENTS = [
  { key: 'best', label: 'Melhores' },
  { key: 'costBenefit', label: 'Custo-beneficio' },
  { key: 'gamer', label: 'Gamer' },
  { key: 'work', label: 'Trabalho' },
  { key: 'study', label: 'Estudo' },
  { key: 'comparison', label: 'Comparativo' },
  { key: 'buyingGuide', label: 'Guia de compra' },
];

const getMetadata = (entity) => {
  return entity?.metadata && typeof entity.metadata === 'object' && !Array.isArray(entity.metadata)
    ? entity.metadata
    : {};
};

const getIntentSearchText = (entity) => {
  const metadata = getMetadata(entity);

  return normalizeKeyText([
    entity?.intent,
    entity?.editorialIntent,
    entity?.editorialKey,
    entity?.keyword,
    entity?.normalizedKeyword,
    entity?.title,
    entity?.slug,
    metadata.intentModifier,
    metadata.modifier,
    metadata.useCase,
  ].filter(Boolean).join(' '));
};

const getCoverageIntent = (entity) => {
  const intent = entity?.editorialIntent || entity?.intent;
  const searchText = getIntentSearchText(entity);

  if (intent === 'costBenefit' || /custo beneficio/.test(searchText)) return 'costBenefit';
  if (intent === 'comparison' || /comparativo|comparacao|\bvs\b|versus/.test(searchText)) return 'comparison';
  if (intent === 'buyingGuide' || /guia de compra/.test(searchText)) return 'buyingGuide';
  if (intent === 'gamer' || /gamer|gaming|jogar|jogos/.test(searchText)) return 'gamer';
  if (intent === 'work' || /trabalhar|trabalho|home office|profissional/.test(searchText)) return 'work';
  if (intent === 'study' || /estudar|estudo|estudante|faculdade|escola/.test(searchText)) return 'study';
  if (intent === 'best' || /melhor|\btop\b|ranking|comprar/.test(searchText)) return 'best';

  return intent || null;
};

const getClusterKey = (value) => singularizeEditorialTerm(value) || normalizeKeyText(value);

const getWorkspaceClusterKeys = (topics = []) => {
  return new Set(topics.map((topic) => getClusterKey(getTopicClusterKey(topic))).filter(Boolean));
};

const getRelatedPages = (topics = [], pages = []) => {
  const clusterKeys = getWorkspaceClusterKeys(topics);

  return pages.filter((page) => clusterKeys.has(getClusterKey(getPageClusterKey(page))));
};

const getLatestDate = (values = []) => {
  const timestamps = values
    .map((value) => value ? new Date(value).getTime() : NaN)
    .filter(Number.isFinite);

  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;
};

const buildCoverage = (pages = []) => {
  const pagesByIntent = new Map(COVERAGE_INTENTS.map((intent) => [intent.key, []]));

  for (const page of pages) {
    const intent = getCoverageIntent(page);

    if (!pagesByIntent.has(intent)) {
      pagesByIntent.set(intent, []);
    }

    pagesByIntent.get(intent).push({
      id: page.id,
      documentId: page.documentId,
      title: page.title,
      slug: page.slug,
      editorialIntent: page.editorialIntent || page.ranking?.editorialIntent || null,
      editorialKey: page.editorialKey || page.ranking?.editorialKey || null,
      categorySlug: page.category?.slug || null,
      publishedAt: page.publishedAt,
    });
  }

  const intents = COVERAGE_INTENTS.map((intent) => ({
    ...intent,
    pageCount: pagesByIntent.get(intent.key)?.length || 0,
    pages: pagesByIntent.get(intent.key) || [],
  }));

  return {
    coveredIntents: intents.filter((intent) => intent.pageCount > 0),
    missingIntents: intents.filter((intent) => intent.pageCount === 0),
    pagesByIntent: intents,
  };
};

const buildWorkspaceMetrics = ({ workspace, topics = [], pages = [] }) => {
  const scores = topics
    .map((topic) => Number(getMetadata(topic).topicScore))
    .filter(Number.isFinite);
  const topicIntents = new Set(topics.map(getCoverageIntent).filter(Boolean));
  const averageTopicScore = scores.length
    ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
    : 0;

  return {
    totalTopics: topics.length,
    pendingTopics: topics.filter((topic) => topic.status === 'pending').length,
    approvedTopics: topics.filter((topic) => topic.status === 'approved').length,
    publishedTopics: topics.filter((topic) => topic.status === 'published').length,
    rejectedTopics: topics.filter((topic) => topic.status === 'rejected').length,
    totalPages: pages.length,
    averageTopicScore,
    distinctIntents: topicIntents.size,
    lastDiscoveryAt: workspace?.lastDiscoveryAt || getLatestDate(
      topics.flatMap((topic) => [topic.generatedAt, topic.createdAt])
    ),
  };
};

const buildWorkspaceGovernance = ({ workspace, topics = [], publishedPages = [] }) => {
  const relatedPages = getRelatedPages(topics, publishedPages);

  return {
    metrics: buildWorkspaceMetrics({ workspace, topics, pages: relatedPages }),
    coverage: buildCoverage(relatedPages),
    pages: relatedPages,
    clusterKeys: [...getWorkspaceClusterKeys(topics)].sort((left, right) => left.localeCompare(right, 'pt-BR')),
  };
};

module.exports = {
  COVERAGE_INTENTS,
  buildCoverage,
  buildWorkspaceGovernance,
  buildWorkspaceMetrics,
  getCoverageIntent,
  getRelatedPages,
};
