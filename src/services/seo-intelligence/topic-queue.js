'use strict';

const uid = {
  editorialTopic: 'api::editorial-topic.editorial-topic',
};

const LIST_LIMIT = 200;
const FINAL_STATUSES = new Set(['processing', 'published']);

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const getStrapi = (strapiInstance) => {
  const activeStrapi = strapiInstance || global.strapi;

  if (!activeStrapi?.db?.query) {
    throw new Error('A Strapi instance is required to manage editorial topics');
  }

  return activeStrapi;
};

const sanitizeText = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const parsePositiveInteger = (value, fallback) => {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : fallback;
};

const serializeTopic = (topic) => ({
  id: topic.id,
  documentId: topic.documentId,
  keyword: topic.keyword,
  normalizedKeyword: topic.normalizedKeyword,
  intent: topic.intent,
  template: topic.template,
  status: topic.status,
  priority: topic.priority,
  source: topic.source,
  sourceMarketplace: topic.sourceMarketplace,
  sourceTerm: topic.sourceTerm,
  sourceCategoryId: topic.sourceCategoryId,
  sourceCategoryName: topic.sourceCategoryName,
  metadata: topic.metadata,
  generatedAt: topic.generatedAt,
  approvedAt: topic.approvedAt,
  publishedAt: topic.publishedAt,
  rejectedAt: topic.rejectedAt,
  createdAt: topic.createdAt,
  updatedAt: topic.updatedAt,
});

const buildWhere = ({ status, intent }) => {
  const where = {};

  if (sanitizeText(status)) {
    where.status = sanitizeText(status);
  }

  if (sanitizeText(intent)) {
    where.intent = sanitizeText(intent);
  }

  return where;
};

const matchesSearch = (topic, search) => {
  const normalizedSearch = sanitizeText(search).toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [
    topic.keyword,
    topic.normalizedKeyword,
    topic.sourceTerm,
  ].some((value) => sanitizeText(value).toLowerCase().includes(normalizedSearch));
};

const listTopics = async (strapiInstance, filters = {}) => {
  const app = getStrapi(strapiInstance);
  const limit = Math.min(parsePositiveInteger(filters.limit, LIST_LIMIT), LIST_LIMIT);
  const topics = await query(app, uid.editorialTopic).findMany({
    where: buildWhere(filters),
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
    limit: LIST_LIMIT,
  });
  const filteredTopics = topics.filter((topic) => matchesSearch(topic, filters.q)).slice(0, limit);

  return {
    topics: filteredTopics.map(serializeTopic),
    count: filteredTopics.length,
    limit,
    filters: {
      status: sanitizeText(filters.status),
      intent: sanitizeText(filters.intent),
      q: sanitizeText(filters.q),
    },
  };
};

const getTopic = async (strapiInstance, id) => {
  const app = getStrapi(strapiInstance);
  const topicId = parsePositiveInteger(id, null);

  if (!topicId) {
    throw new Error('Invalid EditorialTopic id');
  }

  const topic = await query(app, uid.editorialTopic).findOne({
    where: {
      id: topicId,
    },
  });

  if (!topic) {
    throw new Error('EditorialTopic not found');
  }

  return topic;
};

const applyStatusTransition = async (strapiInstance, id, transition) => {
  const app = getStrapi(strapiInstance);
  const topic = await getTopic(app, id);

  if (FINAL_STATUSES.has(topic.status)) {
    return {
      changed: false,
      reason: `${topic.status} topics cannot be changed from the queue`,
      topic: serializeTopic(topic),
    };
  }

  const now = new Date().toISOString();
  let data = null;

  if (transition === 'approve' && ['pending', 'rejected'].includes(topic.status)) {
    data = {
      status: 'approved',
      approvedAt: now,
      rejectedAt: null,
    };
  }

  if (transition === 'reject' && ['pending', 'approved'].includes(topic.status)) {
    data = {
      status: 'rejected',
      rejectedAt: now,
      approvedAt: null,
    };
  }

  if (transition === 'pending' && ['approved', 'rejected'].includes(topic.status)) {
    data = {
      status: 'pending',
      approvedAt: null,
      rejectedAt: null,
    };
  }

  if (!data) {
    return {
      changed: false,
      reason: `Topic already ${topic.status}`,
      topic: serializeTopic(topic),
    };
  }

  const updatedTopic = await query(app, uid.editorialTopic).update({
    where: {
      id: topic.id,
    },
    data,
  });

  return {
    changed: true,
    topic: serializeTopic(updatedTopic),
  };
};

const approveTopic = (strapiInstance, id) => applyStatusTransition(strapiInstance, id, 'approve');

const rejectTopic = (strapiInstance, id) => applyStatusTransition(strapiInstance, id, 'reject');

const moveTopicToPending = (strapiInstance, id) => applyStatusTransition(strapiInstance, id, 'pending');

module.exports = {
  listTopics,
  approveTopic,
  rejectTopic,
  moveTopicToPending,
};
