'use strict';

const {
  createScoringContext,
  scoreTopic,
} = require('./topic-scoring');

const EDITORIAL_TOPIC_UID = 'api::editorial-topic.editorial-topic';
const SCORABLE_STATUSES = ['pending', 'approved', 'published'];

const getStrapi = (strapiInstance) => {
  const activeStrapi = strapiInstance || global.strapi;

  if (!activeStrapi?.db?.query) {
    throw new Error('A Strapi instance is required to refresh topic scores');
  }

  return activeStrapi;
};

const getMetadata = (topic) => {
  return topic?.metadata && typeof topic.metadata === 'object' && !Array.isArray(topic.metadata)
    ? topic.metadata
    : {};
};

const refreshTopicScores = async (strapiInstance) => {
  const app = getStrapi(strapiInstance);
  const topicQuery = app.db.query(EDITORIAL_TOPIC_UID);
  const topics = await topicQuery.findMany({
    where: {
      status: {
        $in: SCORABLE_STATUSES,
      },
    },
    orderBy: [
      { createdAt: 'desc' },
    ],
    limit: 10000,
  });
  const context = await createScoringContext(app);
  const scoredAt = new Date();
  const scoredTopics = [];

  for (const topic of topics) {
    const result = await scoreTopic(app, topic, { context, now: scoredAt });
    const metadata = {
      ...getMetadata(topic),
      topicScore: result.score,
      topicScoreBreakdown: result.breakdown,
      lastScoredAt: scoredAt.toISOString(),
    };

    await topicQuery.update({
      where: {
        id: topic.id,
      },
      data: {
        metadata,
      },
    });

    scoredTopics.push({
      id: topic.id,
      keyword: topic.keyword,
      status: topic.status,
      score: result.score,
      breakdown: result.breakdown,
    });
  }

  scoredTopics.sort((left, right) => {
    return right.score - left.score || left.keyword.localeCompare(right.keyword, 'pt-BR');
  });

  return {
    processed: scoredTopics.length,
    ignoredStatuses: ['processing', 'rejected'],
    topics: scoredTopics,
  };
};

module.exports = {
  refreshTopicScores,
};
