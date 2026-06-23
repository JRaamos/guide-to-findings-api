'use strict';

const {
  buildEditorialKey,
  buildEditorialTermKey,
  normalizeIntent,
  normalizeKeyText,
  singularizeEditorialTerm,
} = require('../editorial-intelligence/editorial-key');
const {
  evaluateClusterEligibility,
} = require('./topic-cluster-eligibility');

const uid = {
  editorialTopic: 'api::editorial-topic.editorial-topic',
  page: 'api::page.page',
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const CANDIDATE_LIMIT = 1000;
const TOPIC_STATUS_ORDER = new Map([
  ['published', 0],
  ['processing', 1],
  ['approved', 2],
  ['pending', 3],
  ['rejected', 4],
]);

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const getStrapi = (strapiInstance) => {
  const activeStrapi = strapiInstance || global.strapi;

  if (!activeStrapi?.db?.query) {
    throw new Error('A Strapi instance is required to calculate topic clusters');
  }

  return activeStrapi;
};

const parsePositiveInteger = (value, fallback) => {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : fallback;
};

const normalizeLimit = (limit) => Math.min(parsePositiveInteger(limit, DEFAULT_LIMIT), MAX_LIMIT);

const normalizeBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  if (value === 'true' || value === '1') {
    return true;
  }

  return fallback;
};

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const getEditorialKeyBase = (editorialKey) => {
  return normalizeText(editorialKey).split(':').filter(Boolean)[0] || null;
};

const getTopicIntentModifier = (topic) => {
  const metadata = topic?.metadata && typeof topic.metadata === 'object' && !Array.isArray(topic.metadata)
    ? topic.metadata
    : {};

  return metadata.intentModifier || metadata.modifier || metadata.useCase || null;
};

const getTopicEditorialKey = (topic) => {
  return buildEditorialKey({
    term: topic?.keyword || topic?.sourceTerm,
    normalizedTerm: topic?.normalizedKeyword,
    intent: topic?.intent,
    intentModifier: getTopicIntentModifier(topic),
  });
};

const getTopicClusterKey = (topic) => {
  const sourceTermClusterKey = buildEditorialTermKey({
    term: topic?.sourceTerm,
    intent: 'best',
  });

  return sourceTermClusterKey || getEditorialKeyBase(getTopicEditorialKey(topic)) || buildEditorialTermKey({
    term: topic?.keyword || topic?.sourceTerm,
    normalizedTerm: topic?.normalizedKeyword,
    intent: normalizeIntent(topic?.intent),
    intentModifier: getTopicIntentModifier(topic),
  });
};

const getPageEditorialKey = (page) => {
  return page?.editorialKey || page?.ranking?.editorialKey || null;
};

const getPageEditorialIntent = (page) => {
  return normalizeIntent(page?.editorialIntent || page?.ranking?.editorialIntent || null);
};

const getPageFallbackEditorialKey = (page) => {
  return buildEditorialKey({
    term: [page?.slug, page?.title].filter(Boolean).join(' '),
    intent: getPageEditorialIntent(page),
  });
};

const getPageResolvedEditorialKey = (page) => getPageEditorialKey(page) || getPageFallbackEditorialKey(page);

const getPageClusterKey = (page) => {
  return getEditorialKeyBase(getPageResolvedEditorialKey(page)) || buildEditorialTermKey({
    term: [page?.slug, page?.title].filter(Boolean).join(' '),
    intent: getPageEditorialIntent(page),
  });
};

const pluralizeWord = (word) => {
  if (!word) {
    return word;
  }

  if (word === 'pneu') {
    return 'pneus';
  }

  if (word.endsWith('ao')) {
    return `${word.slice(0, -2)}oes`;
  }

  if (word.endsWith('r') || word.endsWith('z')) {
    return `${word}es`;
  }

  if (word.endsWith('l')) {
    return `${word.slice(0, -1)}is`;
  }

  if (!word.endsWith('s')) {
    return `${word}s`;
  }

  return word;
};

const titleCase = (value = '') => normalizeText(value)
  .split(' ')
  .filter(Boolean)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

const buildClusterTitle = (clusterKey) => {
  const words = normalizeText(clusterKey).split(' ').filter(Boolean);

  if (!words.length) {
    return 'Sem tema';
  }

  if (clusterKey === 'air fryer') {
    return 'Air Fryers';
  }

  return titleCase([pluralizeWord(words[0]), ...words.slice(1)].join(' '));
};

const createEmptyStatusCounts = () => ({
  pending: 0,
  approved: 0,
  processing: 0,
  published: 0,
  rejected: 0,
});

const createCluster = (clusterKey) => ({
  clusterKey,
  title: buildClusterTitle(clusterKey),
  totalTopics: 0,
  topicsByStatus: createEmptyStatusCounts(),
  pages: [],
  topics: [],
  publishedPageCount: 0,
  approvedTopicCount: 0,
  pendingTopicCount: 0,
  maxPriority: 0,
});

const getOrCreateCluster = (clusters, clusterKey) => {
  const safeClusterKey = singularizeEditorialTerm(clusterKey) || normalizeKeyText(clusterKey);

  if (!safeClusterKey) {
    return null;
  }

  if (!clusters.has(safeClusterKey)) {
    clusters.set(safeClusterKey, createCluster(safeClusterKey));
  }

  return clusters.get(safeClusterKey);
};

const serializeTopic = (topic, editorialKey) => ({
  topicId: topic.id,
  id: topic.id,
  keyword: topic.keyword,
  intent: normalizeIntent(topic.intent),
  status: topic.status || 'pending',
  priority: Number.isInteger(Number(topic.priority)) ? Number(topic.priority) : 0,
  editorialKey,
});

const serializePage = (page, editorialKey) => ({
  pageId: page.id,
  id: page.id,
  title: page.title,
  slug: page.slug,
  categorySlug: page.category?.slug || null,
  editorialIntent: getPageEditorialIntent(page),
  editorialKey,
});

const compareTopics = (first, second) => {
  const firstStatus = TOPIC_STATUS_ORDER.has(first.status) ? TOPIC_STATUS_ORDER.get(first.status) : 99;
  const secondStatus = TOPIC_STATUS_ORDER.has(second.status) ? TOPIC_STATUS_ORDER.get(second.status) : 99;

  if (firstStatus !== secondStatus) {
    return firstStatus - secondStatus;
  }

  if (second.priority !== first.priority) {
    return second.priority - first.priority;
  }

  return normalizeText(first.keyword).localeCompare(normalizeText(second.keyword), 'pt-BR');
};

const comparePages = (first, second) => {
  return normalizeText(first.title).localeCompare(normalizeText(second.title), 'pt-BR');
};

const compareClusters = (first, second) => {
  if (second.publishedPageCount !== first.publishedPageCount) {
    return second.publishedPageCount - first.publishedPageCount;
  }

  if (second.approvedTopicCount !== first.approvedTopicCount) {
    return second.approvedTopicCount - first.approvedTopicCount;
  }

  if (second.pendingTopicCount !== first.pendingTopicCount) {
    return second.pendingTopicCount - first.pendingTopicCount;
  }

  if (second.maxPriority !== first.maxPriority) {
    return second.maxPriority - first.maxPriority;
  }

  return first.clusterKey.localeCompare(second.clusterKey, 'pt-BR');
};

const finalizeCluster = async (cluster) => {
  const finalizedCluster = {
    clusterKey: cluster.clusterKey,
    title: cluster.title,
    totalTopics: cluster.totalTopics,
    topicsByStatus: cluster.topicsByStatus,
    pages: cluster.pages.sort(comparePages),
    topics: cluster.topics.sort(compareTopics),
  };

  return {
    ...finalizedCluster,
    hubEligibility: await evaluateClusterEligibility(finalizedCluster),
  };
};

const addTopicToClusters = (clusters, seenTopicIds, topic) => {
  if (!topic?.id || seenTopicIds.has(topic.id)) {
    return;
  }

  const editorialKey = getTopicEditorialKey(topic);
  const cluster = getOrCreateCluster(clusters, getTopicClusterKey(topic));

  if (!cluster) {
    return;
  }

  const serializedTopic = serializeTopic(topic, editorialKey);
  const status = serializedTopic.status;

  seenTopicIds.add(topic.id);
  cluster.topics.push(serializedTopic);
  cluster.totalTopics += 1;
  cluster.topicsByStatus[status] = (cluster.topicsByStatus[status] || 0) + 1;
  cluster.approvedTopicCount = cluster.topicsByStatus.approved || 0;
  cluster.pendingTopicCount = cluster.topicsByStatus.pending || 0;
  cluster.maxPriority = Math.max(cluster.maxPriority, serializedTopic.priority);
};

const addPageToClusters = (clusters, seenPageIds, page) => {
  if (!page?.id || seenPageIds.has(page.id)) {
    return;
  }

  const editorialKey = getPageResolvedEditorialKey(page);
  const cluster = getOrCreateCluster(clusters, getPageClusterKey(page));

  if (!cluster) {
    return;
  }

  seenPageIds.add(page.id);
  cluster.pages.push(serializePage(page, editorialKey));
  cluster.publishedPageCount += 1;
};

const findTopics = (strapi, workspaceId) => query(strapi, uid.editorialTopic).findMany({
  where: workspaceId ? { discoveryWorkspace: { id: workspaceId } } : {},
  populate: ['discoveryWorkspace', 'page'],
  orderBy: [
    { priority: 'desc' },
    { createdAt: 'desc' },
  ],
  limit: CANDIDATE_LIMIT,
});

const findPublishedPages = (strapi) => query(strapi, uid.page).findMany({
  where: {
    status: 'published',
    pageType: 'ranking',
  },
  populate: {
    ranking: true,
    category: true,
  },
  orderBy: [
    { updatedAt: 'desc' },
  ],
  limit: CANDIDATE_LIMIT,
});

const resolveArgs = (strapiOrOptions = {}, maybeOptions) => {
  if (strapiOrOptions?.db) {
    return {
      strapi: getStrapi(strapiOrOptions),
      options: maybeOptions || {},
    };
  }

  return {
    strapi: getStrapi(),
    options: strapiOrOptions || {},
  };
};

const getTopicClusters = async (strapiOrOptions = {}, maybeOptions) => {
  const { strapi, options } = resolveArgs(strapiOrOptions, maybeOptions);
  const limit = normalizeLimit(options.limit);
  const includePages = normalizeBoolean(options.includePages, true);
  const workspaceId = parsePositiveInteger(options.workspaceId, null);
  const clusters = new Map();
  const seenTopicIds = new Set();
  const seenPageIds = new Set();
  const topics = await findTopics(strapi, workspaceId);

  for (const topic of topics) {
    addTopicToClusters(clusters, seenTopicIds, topic);
  }

  if (includePages) {
    const pages = await findPublishedPages(strapi);
    const workspaceClusterKeys = workspaceId ? new Set(clusters.keys()) : null;

    for (const page of pages) {
      const pageClusterKey = singularizeEditorialTerm(getPageClusterKey(page)) || normalizeKeyText(getPageClusterKey(page));

      if (workspaceClusterKeys && !workspaceClusterKeys.has(pageClusterKey)) {
        continue;
      }

      addPageToClusters(clusters, seenPageIds, page);
    }
  }

  const limitedClusters = Array.from(clusters.values())
    .sort(compareClusters)
    .slice(0, limit);

  return Promise.all(limitedClusters.map(finalizeCluster));
};

module.exports = {
  getPageClusterKey,
  getTopicClusterKey,
  getTopicClusters,
};
