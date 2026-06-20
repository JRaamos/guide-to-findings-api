'use strict';

const { normalizeKeyword } = require('./keyword-discovery');

const uid = {
  workspace: 'api::discovery-workspace.discovery-workspace',
  topic: 'api::editorial-topic.editorial-topic',
};

const QUERY_LIMIT = 10000;
const query = (strapi, modelUid) => strapi.db.query(modelUid);

const sanitizeText = (value) => {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
};

const formatWorkspaceName = (value) => {
  const name = sanitizeText(value);

  return name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
};

const getStrapi = (strapiInstance) => {
  const app = strapiInstance || global.strapi;

  if (!app?.db?.query) {
    throw new Error('A Strapi instance is required to manage discovery workspaces');
  }

  return app;
};

const serializeWorkspace = (workspace, counts = {}) => ({
  id: workspace.id,
  documentId: workspace.documentId,
  name: workspace.name,
  normalizedName: workspace.normalizedName,
  status: workspace.status,
  sourceKeyword: workspace.sourceKeyword,
  totalTopics: Number(counts.totalTopics ?? workspace.totalTopics) || 0,
  pendingTopics: Number(counts.pendingTopics) || 0,
  approvedTopics: Number(counts.approvedTopics) || 0,
  publishedTopics: Number(counts.publishedTopics) || 0,
  createdAt: workspace.createdAt,
  updatedAt: workspace.updatedAt,
});

const findOrCreateDiscoveryWorkspace = async (strapiInstance, { sourceKeyword } = {}) => {
  const app = getStrapi(strapiInstance);
  const normalizedSourceKeyword = sanitizeText(sourceKeyword);
  const normalizedName = normalizeKeyword(normalizedSourceKeyword);

  if (!normalizedSourceKeyword || !normalizedName) {
    throw new Error('sourceKeyword is required to create a discovery workspace');
  }

  const existing = await query(app, uid.workspace).findOne({
    where: { normalizedName },
  });

  if (existing) {
    if (existing.status !== 'active') {
      return query(app, uid.workspace).update({
        where: { id: existing.id },
        data: { status: 'active' },
      });
    }

    return existing;
  }

  return query(app, uid.workspace).create({
    data: {
      name: formatWorkspaceName(normalizedSourceKeyword),
      normalizedName,
      status: 'active',
      sourceKeyword: normalizedSourceKeyword,
      totalTopics: 0,
    },
  });
};

const refreshDiscoveryWorkspaceTotal = async (strapiInstance, workspaceId) => {
  const app = getStrapi(strapiInstance);
  const id = Number(workspaceId);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  const workspace = await query(app, uid.workspace).findOne({ where: { id } });

  if (!workspace) {
    return null;
  }

  const totalTopics = await query(app, uid.topic).count({
    where: { discoveryWorkspace: { id } },
  });

  if (Number(workspace.totalTopics) === totalTopics) {
    return serializeWorkspace(workspace, { totalTopics });
  }

  const updated = await query(app, uid.workspace).update({
    where: { id },
    data: { totalTopics },
  });

  return serializeWorkspace(updated, { totalTopics });
};

const listDiscoveryWorkspaces = async (strapiInstance, { includeArchived = false } = {}) => {
  const app = getStrapi(strapiInstance);
  const workspaces = await query(app, uid.workspace).findMany({
    where: includeArchived ? {} : { status: 'active' },
    orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
    limit: QUERY_LIMIT,
  });
  const topics = await query(app, uid.topic).findMany({
    populate: ['discoveryWorkspace'],
    limit: QUERY_LIMIT,
  });
  const countsByWorkspace = new Map();

  for (const topic of topics) {
    const workspaceId = topic.discoveryWorkspace?.id;

    if (!workspaceId) {
      continue;
    }

    const counts = countsByWorkspace.get(workspaceId) || {
      totalTopics: 0,
      pendingTopics: 0,
      approvedTopics: 0,
      publishedTopics: 0,
    };

    counts.totalTopics += 1;

    if (topic.status === 'pending') counts.pendingTopics += 1;
    if (topic.status === 'approved') counts.approvedTopics += 1;
    if (topic.status === 'published') counts.publishedTopics += 1;

    countsByWorkspace.set(workspaceId, counts);
  }

  return workspaces.map((workspace) => {
    return serializeWorkspace(workspace, countsByWorkspace.get(workspace.id));
  });
};

const backfillDiscoveryWorkspaces = async (strapiInstance) => {
  const app = getStrapi(strapiInstance);
  const topics = await query(app, uid.topic).findMany({
    populate: ['discoveryWorkspace'],
    orderBy: [{ createdAt: 'asc' }],
    limit: QUERY_LIMIT,
  });
  const workspaceByTerm = new Map();
  const touchedWorkspaceIds = new Set();
  const result = { linkedTopics: 0, skippedTopics: 0, workspaces: 0 };

  for (const topic of topics) {
    if (topic.discoveryWorkspace?.id) {
      touchedWorkspaceIds.add(topic.discoveryWorkspace.id);
      continue;
    }

    const sourceTerm = sanitizeText(topic.sourceTerm);
    const normalizedTerm = normalizeKeyword(sourceTerm);

    if (!sourceTerm || !normalizedTerm) {
      result.skippedTopics += 1;
      continue;
    }

    let workspace = workspaceByTerm.get(normalizedTerm);

    if (!workspace) {
      workspace = await findOrCreateDiscoveryWorkspace(app, { sourceKeyword: sourceTerm });
      workspaceByTerm.set(normalizedTerm, workspace);
    }

    await query(app, uid.topic).update({
      where: { id: topic.id },
      data: { discoveryWorkspace: workspace.id },
    });
    touchedWorkspaceIds.add(workspace.id);
    result.linkedTopics += 1;
  }

  for (const workspaceId of touchedWorkspaceIds) {
    await refreshDiscoveryWorkspaceTotal(app, workspaceId);
  }

  result.workspaces = touchedWorkspaceIds.size;
  return result;
};

module.exports = {
  backfillDiscoveryWorkspaces,
  findOrCreateDiscoveryWorkspace,
  listDiscoveryWorkspaces,
  refreshDiscoveryWorkspaceTotal,
  serializeWorkspace,
};
