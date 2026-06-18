'use strict';

const { isDeepStrictEqual } = require('node:util');
const {
  normalizeKeyword,
} = require('./keyword-discovery');

const uid = {
  editorialTopic: 'api::editorial-topic.editorial-topic',
};

const DEFAULT_STATUS = 'pending';
const DEFAULT_PRIORITY = 50;
const DEFAULT_SOURCE_MARKETPLACE = 'mercadoLivre';
const VALID_INTENTS = new Set(['best', 'costBenefit', 'comparison', 'buyingGuide', 'useCase']);
const VALID_TEMPLATES = new Set(['automatic', 'top-list', 'cost-benefit', 'comparison', 'buying-guide']);

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const getStrapi = (strapiInstance) => {
  const activeStrapi = strapiInstance || global.strapi;

  if (!activeStrapi?.db?.query) {
    throw new Error('A Strapi instance is required to persist editorial topics');
  }

  return activeStrapi;
};

const sanitizeText = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const normalizePriority = (value) => {
  const priority = Number(value);

  return Number.isInteger(priority) ? priority : DEFAULT_PRIORITY;
};

const normalizeMetadata = (metadata) => {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata
    : {};
};

const metadataChanged = (nextMetadata, existingMetadata) => {
  return !isDeepStrictEqual(nextMetadata || {}, existingMetadata || {});
};

const mergeAdditionalMetadata = (existingMetadata, incomingMetadata) => {
  return {
    ...normalizeMetadata(incomingMetadata),
    ...normalizeMetadata(existingMetadata),
  };
};

const normalizeTopic = (topic = {}) => {
  const keyword = sanitizeText(topic.keyword);
  const normalizedKeyword = normalizeKeyword(topic.normalizedKeyword || keyword);

  if (!keyword || !normalizedKeyword) {
    return null;
  }

  return {
    keyword,
    normalizedKeyword,
    intent: VALID_INTENTS.has(topic.intent) ? topic.intent : null,
    template: VALID_TEMPLATES.has(topic.template) ? topic.template : 'automatic',
    priority: normalizePriority(topic.priority),
    source: sanitizeText(topic.source),
    metadata: normalizeMetadata(topic.metadata),
  };
};

const findByNormalizedKeyword = (strapi, normalizedKeyword) => {
  return query(strapi, uid.editorialTopic).findOne({
    where: {
      normalizedKeyword,
    },
  });
};

const buildCreateData = ({
  topic,
  sourceTerm,
  sourceMarketplace,
  sourceCategoryId,
  sourceCategoryName,
}) => ({
  keyword: topic.keyword,
  normalizedKeyword: topic.normalizedKeyword,
  intent: topic.intent,
  template: topic.template,
  status: DEFAULT_STATUS,
  priority: topic.priority,
  source: topic.source,
  sourceMarketplace,
  sourceTerm,
  sourceCategoryId,
  sourceCategoryName,
  metadata: topic.metadata,
  generatedAt: new Date().toISOString(),
});

const buildSafeUpdateData = ({
  existing,
  topic,
  sourceTerm,
  sourceCategoryId,
  sourceCategoryName,
}) => {
  const data = {};

  if (topic.priority > normalizePriority(existing.priority)) {
    data.priority = topic.priority;
  }

  const nextMetadata = mergeAdditionalMetadata(existing.metadata, topic.metadata);

  if (metadataChanged(nextMetadata, existing.metadata)) {
    data.metadata = nextMetadata;
  }

  if (!sanitizeText(existing.sourceTerm) && sourceTerm) {
    data.sourceTerm = sourceTerm;
  }

  if (!sanitizeText(existing.sourceCategoryId) && sourceCategoryId) {
    data.sourceCategoryId = sourceCategoryId;
  }

  if (!sanitizeText(existing.sourceCategoryName) && sourceCategoryName) {
    data.sourceCategoryName = sourceCategoryName;
  }

  return data;
};

const toSummaryTopic = (topic, action) => ({
  action,
  id: topic.id,
  documentId: topic.documentId,
  keyword: topic.keyword,
  normalizedKeyword: topic.normalizedKeyword,
  intent: topic.intent,
  template: topic.template,
  status: topic.status,
  priority: topic.priority,
});

const persistEditorialTopics = async ({
  topics = [],
  sourceTerm,
  sourceMarketplace = DEFAULT_SOURCE_MARKETPLACE,
  sourceCategoryId = null,
  sourceCategoryName = null,
  strapi: strapiInstance,
} = {}) => {
  const app = getStrapi(strapiInstance);
  const normalizedSourceTerm = sanitizeText(sourceTerm);
  const normalizedSourceMarketplace = sanitizeText(sourceMarketplace) || DEFAULT_SOURCE_MARKETPLACE;
  const normalizedSourceCategoryId = sourceCategoryId ? String(sourceCategoryId) : null;
  const normalizedSourceCategoryName = sanitizeText(sourceCategoryName) || null;
  const result = {
    created: 0,
    updated: 0,
    skipped: 0,
    topics: [],
  };

  for (const rawTopic of topics) {
    const topic = normalizeTopic(rawTopic);

    if (!topic) {
      result.skipped += 1;
      continue;
    }

    const existing = await findByNormalizedKeyword(app, topic.normalizedKeyword);

    if (!existing) {
      const createdTopic = await query(app, uid.editorialTopic).create({
        data: buildCreateData({
          topic,
          sourceTerm: normalizedSourceTerm,
          sourceMarketplace: normalizedSourceMarketplace,
          sourceCategoryId: normalizedSourceCategoryId,
          sourceCategoryName: normalizedSourceCategoryName,
        }),
      });

      result.created += 1;
      result.topics.push(toSummaryTopic(createdTopic, 'created'));
      continue;
    }

    const safeUpdateData = buildSafeUpdateData({
      existing,
      topic,
      sourceTerm: normalizedSourceTerm,
      sourceCategoryId: normalizedSourceCategoryId,
      sourceCategoryName: normalizedSourceCategoryName,
    });

    if (!Object.keys(safeUpdateData).length) {
      result.skipped += 1;
      result.topics.push(toSummaryTopic(existing, 'skipped'));
      continue;
    }

    const updatedTopic = await query(app, uid.editorialTopic).update({
      where: {
        id: existing.id,
      },
      data: safeUpdateData,
    });

    result.updated += 1;
    result.topics.push(toSummaryTopic(updatedTopic, 'updated'));
  }

  return result;
};

module.exports = {
  persistEditorialTopics,
};
