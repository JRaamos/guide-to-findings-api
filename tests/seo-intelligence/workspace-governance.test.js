'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildWorkspaceGovernance,
} = require('../../src/services/seo-intelligence/workspace-governance');

const workspace = {
  id: 1,
  lastDiscoveryAt: '2026-06-21T12:00:00.000Z',
};

const topics = [
  {
    id: 1,
    sourceTerm: 'notebooks',
    keyword: 'melhores notebooks',
    normalizedKeyword: 'melhores notebooks',
    intent: 'best',
    status: 'pending',
    metadata: { topicScore: 80 },
  },
  {
    id: 2,
    sourceTerm: 'notebook',
    keyword: 'notebooks custo-beneficio',
    normalizedKeyword: 'notebooks custo beneficio',
    intent: 'costBenefit',
    status: 'published',
    metadata: { topicScore: 60 },
  },
];

const pages = [
  {
    id: 10,
    title: 'Melhores notebooks',
    slug: 'melhores-notebooks',
    status: 'published',
    editorialIntent: 'best',
    editorialKey: 'notebook:best',
  },
  {
    id: 11,
    title: 'Notebooks gamer',
    slug: 'notebooks-gamer',
    status: 'published',
    editorialIntent: 'gamer',
    editorialKey: 'notebook:gamer',
  },
  {
    id: 12,
    title: 'Melhores air fryers',
    slug: 'melhores-air-fryers',
    status: 'published',
    editorialIntent: 'best',
    editorialKey: 'air fryer:best',
  },
];

test('calculates workspace metrics without including unrelated pages', () => {
  const result = buildWorkspaceGovernance({ workspace, topics, publishedPages: pages });

  assert.deepEqual(result.metrics, {
    totalTopics: 2,
    pendingTopics: 1,
    approvedTopics: 0,
    publishedTopics: 1,
    rejectedTopics: 0,
    totalPages: 2,
    averageTopicScore: 70,
    distinctIntents: 2,
    lastDiscoveryAt: '2026-06-21T12:00:00.000Z',
  });
});

test('reports covered and missing editorial intents', () => {
  const result = buildWorkspaceGovernance({ workspace, topics, publishedPages: pages });

  assert.deepEqual(result.coverage.coveredIntents.map((intent) => intent.key), ['best', 'gamer']);
  assert.ok(result.coverage.missingIntents.some((intent) => intent.key === 'comparison'));
  assert.equal(result.coverage.pagesByIntent.find((intent) => intent.key === 'gamer').pageCount, 1);
});

test('infers best coverage for legacy published pages without editorial intent', () => {
  const airFryerTopic = {
    id: 3,
    sourceTerm: 'air fryers',
    keyword: 'melhores air fryers',
    intent: 'best',
    status: 'pending',
    metadata: { topicScore: 70 },
  };
  const legacyPage = {
    id: 13,
    title: 'As 5 melhores air fryers para comprar',
    slug: 'melhores-air-fryers',
    status: 'published',
  };
  const result = buildWorkspaceGovernance({
    workspace,
    topics: [airFryerTopic],
    publishedPages: [legacyPage],
  });

  assert.equal(result.coverage.coveredIntents[0].key, 'best');
  assert.equal(result.metrics.totalPages, 1);
});
