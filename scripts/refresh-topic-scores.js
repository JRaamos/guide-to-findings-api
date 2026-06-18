'use strict';

require('dotenv').config();

const { createStrapi } = require('@strapi/strapi');
const {
  refreshTopicScores,
} = require('../src/services/seo-intelligence/topic-score-refresh');

const printSummary = (result) => {
  console.log('Topic Score Refresh');
  console.log('');
  console.log(`Processed: ${result.processed}`);
  console.log(`Ignored statuses: ${result.ignoredStatuses.join(', ')}`);
  console.log('');
  console.log('Top 10 topics:');

  for (const topic of result.topics.slice(0, 10)) {
    console.log(`#${topic.id} ${topic.score} - ${topic.keyword}`);
    console.log(`  ${JSON.stringify(topic.breakdown)}`);
  }
};

const main = async () => {
  const app = await createStrapi().load();

  try {
    const result = await refreshTopicScores(app);

    printSummary(result);
  } finally {
    await app.destroy();
  }
};

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: error.message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
