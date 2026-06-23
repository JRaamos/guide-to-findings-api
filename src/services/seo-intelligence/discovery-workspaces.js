'use strict';

const {
  buildWorkspaceKey,
  workspaceKeyToName,
  workspaceKeyToNormalizedName,
} = require('./workspace-key');
const {
  buildWorkspaceGovernance,
} = require('./workspace-governance');
const {
  getTopicClusters,
} = require('./topic-clusters');

const uid = {
  workspace: 'api::discovery-workspace.discovery-workspace',
  topic: 'api::editorial-topic.editorial-topic',
  page: 'api::page.page',
};

const QUERY_LIMIT = 10000;
const WORKSPACE_TOPIC_LINK_TABLE = 'editorial_topics_discovery_workspace_lnk';
const query = (strapi, modelUid) => strapi.db.query(modelUid);

const sanitizeText = (value) => {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
};

const getStrapi = (strapiInstance) => {
  const app = strapiInstance || global.strapi;

  if (!app?.db?.query) {
    throw new Error('A Strapi instance is required to manage discovery workspaces');
  }

  return app;
};

const serializeWorkspace = (workspace, governance = {}) => {
  const metrics = governance.metrics || {};

  return {
    id: workspace.id,
    documentId: workspace.documentId,
    name: workspace.name,
    normalizedName: workspace.normalizedName,
    workspaceKey: workspace.workspaceKey || buildWorkspaceKey(workspace.sourceKeyword || workspace.name),
    status: workspace.status,
    sourceKeyword: workspace.sourceKeyword,
    totalTopics: Number(metrics.totalTopics ?? workspace.totalTopics) || 0,
    pendingTopics: Number(metrics.pendingTopics) || 0,
    approvedTopics: Number(metrics.approvedTopics) || 0,
    publishedTopics: Number(metrics.publishedTopics) || 0,
    rejectedTopics: Number(metrics.rejectedTopics) || 0,
    totalPages: Number(metrics.totalPages) || 0,
    averageTopicScore: Number(metrics.averageTopicScore) || 0,
    distinctIntents: Number(metrics.distinctIntents) || 0,
    lastDiscoveryAt: metrics.lastDiscoveryAt || workspace.lastDiscoveryAt || null,
    coverage: governance.coverage || null,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
};

const findPublishedPages = (app) => query(app, uid.page).findMany({
  where: {
    status: 'published',
    pageType: 'ranking',
  },
  populate: {
    ranking: true,
    category: true,
  },
  limit: QUERY_LIMIT,
});

const findOrCreateDiscoveryWorkspace = async (strapiInstance, { sourceKeyword } = {}) => {
  const app = getStrapi(strapiInstance);
  const normalizedSourceKeyword = sanitizeText(sourceKeyword);
  const workspaceKey = buildWorkspaceKey(normalizedSourceKeyword);

  if (!normalizedSourceKeyword || !workspaceKey) {
    throw new Error('sourceKeyword is required to create a discovery workspace');
  }

  const existing = await query(app, uid.workspace).findOne({
    where: { workspaceKey },
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

  const normalizedName = workspaceKeyToNormalizedName(workspaceKey);

  return query(app, uid.workspace).create({
    data: {
      name: workspaceKeyToName(workspaceKey),
      normalizedName,
      workspaceKey,
      status: 'active',
      sourceKeyword: normalizedName,
      totalTopics: 0,
      lastDiscoveryAt: new Date().toISOString(),
    },
  });
};

const markDiscoveryWorkspace = async (strapiInstance, workspaceId, discoveredAt = new Date()) => {
  const app = getStrapi(strapiInstance);
  const id = Number(workspaceId);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return query(app, uid.workspace).update({
    where: { id },
    data: {
      lastDiscoveryAt: discoveredAt.toISOString(),
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

  if (Number(workspace.totalTopics) !== totalTopics) {
    await query(app, uid.workspace).update({
      where: { id },
      data: { totalTopics },
    });
  }

  const refreshedWorkspace = await query(app, uid.workspace).findOne({ where: { id } });
  const topics = await query(app, uid.topic).findMany({
    where: { discoveryWorkspace: { id } },
    populate: ['discoveryWorkspace', 'page'],
    limit: QUERY_LIMIT,
  });
  const governance = buildWorkspaceGovernance({
    workspace: refreshedWorkspace,
    topics,
    publishedPages: await findPublishedPages(app),
  });

  return serializeWorkspace(refreshedWorkspace, governance);
};

const loadWorkspaceGovernanceData = async (app, workspaces) => {
  const [topics, publishedPages] = await Promise.all([
    query(app, uid.topic).findMany({
      populate: ['discoveryWorkspace', 'page'],
      limit: QUERY_LIMIT,
    }),
    findPublishedPages(app),
  ]);
  const topicsByWorkspace = new Map();

  for (const topic of topics) {
    const workspaceId = topic.discoveryWorkspace?.id;

    if (!workspaceId) continue;
    if (!topicsByWorkspace.has(workspaceId)) topicsByWorkspace.set(workspaceId, []);
    topicsByWorkspace.get(workspaceId).push(topic);
  }

  return new Map(workspaces.map((workspace) => [
    workspace.id,
    buildWorkspaceGovernance({
      workspace,
      topics: topicsByWorkspace.get(workspace.id) || [],
      publishedPages,
    }),
  ]));
};

const listDiscoveryWorkspaces = async (strapiInstance, { includeArchived = false } = {}) => {
  const app = getStrapi(strapiInstance);
  const workspaces = await query(app, uid.workspace).findMany({
    where: includeArchived ? {} : { status: 'active' },
    orderBy: [{ lastDiscoveryAt: 'desc' }, { updatedAt: 'desc' }, { name: 'asc' }],
    limit: QUERY_LIMIT,
  });
  const governanceByWorkspace = await loadWorkspaceGovernanceData(app, workspaces);

  return workspaces.map((workspace) => {
    return serializeWorkspace(workspace, governanceByWorkspace.get(workspace.id));
  });
};

const getDiscoveryWorkspaceDetail = async (strapiInstance, workspaceId) => {
  const app = getStrapi(strapiInstance);
  const id = Number(workspaceId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Invalid DiscoveryWorkspace id');
  }

  const workspace = await query(app, uid.workspace).findOne({ where: { id } });

  if (!workspace) {
    throw new Error('DiscoveryWorkspace not found');
  }

  const [topics, publishedPages, clusters] = await Promise.all([
    query(app, uid.topic).findMany({
      where: { discoveryWorkspace: { id } },
      populate: ['discoveryWorkspace', 'page'],
      limit: QUERY_LIMIT,
    }),
    findPublishedPages(app),
    getTopicClusters(app, { workspaceId: id, includePages: true, limit: 100 }),
  ]);
  const governance = buildWorkspaceGovernance({ workspace, topics, publishedPages });

  return {
    workspace: serializeWorkspace(workspace, governance),
    coverage: governance.coverage,
    pages: governance.pages.map((page) => ({
      id: page.id,
      documentId: page.documentId,
      title: page.title,
      slug: page.slug,
      editorialIntent: page.editorialIntent || page.ranking?.editorialIntent || null,
      editorialKey: page.editorialKey || page.ranking?.editorialKey || null,
      categorySlug: page.category?.slug || null,
      publishedAt: page.publishedAt,
    })),
    clusters,
  };
};

const chooseCanonicalWorkspace = (workspaces, workspaceKey) => {
  const normalizedName = workspaceKeyToNormalizedName(workspaceKey);

  return [...workspaces].sort((left, right) => {
    const leftExact = left.normalizedName === normalizedName ? 1 : 0;
    const rightExact = right.normalizedName === normalizedName ? 1 : 0;

    if (rightExact !== leftExact) return rightExact - leftExact;
    if ((right.status === 'active') !== (left.status === 'active')) return right.status === 'active' ? 1 : -1;
    return left.id - right.id;
  })[0];
};

const valuesEqual = (left, right) => {
  if (left === right) return true;

  const leftDate = left ? new Date(left).getTime() : NaN;
  const rightDate = right ? new Date(right).getTime() : NaN;

  return Number.isFinite(leftDate) && Number.isFinite(rightDate) && leftDate === rightDate;
};

const canonicalizeDiscoveryWorkspaces = async (strapiInstance) => {
  const app = getStrapi(strapiInstance);
  const workspaces = await query(app, uid.workspace).findMany({
    orderBy: [{ id: 'asc' }],
    limit: QUERY_LIMIT,
  });
  const groups = new Map();

  for (const workspace of workspaces) {
    const workspaceKey = buildWorkspaceKey(
      workspace.workspaceKey || workspace.sourceKeyword || workspace.normalizedName || workspace.name
    );

    if (!workspaceKey) continue;
    if (!groups.has(workspaceKey)) groups.set(workspaceKey, []);
    groups.get(workspaceKey).push(workspace);
  }

  const result = {
    workspacesBefore: workspaces.length,
    workspacesAfter: 0,
    canonicalized: 0,
    merged: 0,
    movedTopics: 0,
    groups: [],
  };

  for (const [workspaceKey, group] of groups) {
    const canonical = chooseCanonicalWorkspace(group, workspaceKey);
    const duplicates = group.filter((workspace) => workspace.id !== canonical.id);
    const duplicateIds = duplicates.map((workspace) => workspace.id);

    if (duplicateIds.length) {
      const movedTopics = await app.db.connection(WORKSPACE_TOPIC_LINK_TABLE)
        .whereIn('discovery_workspace_id', duplicateIds)
        .update({ discovery_workspace_id: canonical.id });

      result.movedTopics += Number(movedTopics) || 0;

      for (const duplicate of duplicates) {
        await query(app, uid.workspace).delete({ where: { id: duplicate.id } });
      }
    }

    const totalTopics = await query(app, uid.topic).count({
      where: { discoveryWorkspace: { id: canonical.id } },
    });
    const canonicalName = workspaceKeyToName(workspaceKey);
    const normalizedName = workspaceKeyToNormalizedName(workspaceKey);
    const lastDiscoveryAt = group
      .map((workspace) => workspace.lastDiscoveryAt || workspace.updatedAt || workspace.createdAt)
      .filter(Boolean)
      .sort()
      .at(-1) || null;

    const nextData = {
      name: canonicalName,
      normalizedName,
      workspaceKey,
      sourceKeyword: normalizedName,
      status: group.some((workspace) => workspace.status === 'active') ? 'active' : canonical.status,
      totalTopics,
      lastDiscoveryAt,
    };
    const changed = Object.entries(nextData).some(([field, value]) => !valuesEqual(canonical[field], value));

    if (changed) {
      await query(app, uid.workspace).update({
        where: { id: canonical.id },
        data: nextData,
      });
    }

    result.canonicalized += 1;
    result.merged += duplicates.length;
    result.groups.push({
      workspaceKey,
      canonicalWorkspaceId: canonical.id,
      mergedWorkspaceIds: duplicateIds,
      totalTopics,
    });
  }

  result.workspacesAfter = await query(app, uid.workspace).count();
  return result;
};

const backfillDiscoveryWorkspaces = async (strapiInstance) => {
  const app = getStrapi(strapiInstance);
  const canonicalization = await canonicalizeDiscoveryWorkspaces(app);
  const topics = await query(app, uid.topic).findMany({
    populate: ['discoveryWorkspace'],
    orderBy: [{ createdAt: 'asc' }],
    limit: QUERY_LIMIT,
  });
  const touchedWorkspaceIds = new Set();
  const result = {
    ...canonicalization,
    linkedTopics: 0,
    skippedTopics: 0,
    workspaces: canonicalization.workspacesAfter,
  };

  for (const topic of topics) {
    if (topic.discoveryWorkspace?.id) {
      touchedWorkspaceIds.add(topic.discoveryWorkspace.id);
      continue;
    }

    const sourceTerm = sanitizeText(topic.sourceTerm);

    if (!sourceTerm || !buildWorkspaceKey(sourceTerm)) {
      result.skippedTopics += 1;
      continue;
    }

    const workspace = await findOrCreateDiscoveryWorkspace(app, { sourceKeyword: sourceTerm });

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

  return result;
};

module.exports = {
  backfillDiscoveryWorkspaces,
  canonicalizeDiscoveryWorkspaces,
  findOrCreateDiscoveryWorkspace,
  getDiscoveryWorkspaceDetail,
  listDiscoveryWorkspaces,
  markDiscoveryWorkspace,
  refreshDiscoveryWorkspaceTotal,
  serializeWorkspace,
};
