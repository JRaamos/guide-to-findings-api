'use strict';

require('dotenv').config();

const { createStrapi } = require('@strapi/strapi');
const {
  getTopicClusters,
} = require('../src/services/seo-intelligence/topic-clusters');

const parseArgs = (args) => {
  const limitFlagIndex = args.findIndex((arg) => arg === '--limit' || arg === '-l');
  const noPages = args.includes('--no-pages');
  let limit;

  if (limitFlagIndex >= 0) {
    limit = Number(args[limitFlagIndex + 1]);
  }

  return {
    limit,
    includePages: !noPages,
  };
};

const printCluster = (cluster) => {
  const statusSummary = Object.entries(cluster.topicsByStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${status}: ${count}`)
    .join(', ') || 'sem topics';

  console.log(`- ${cluster.clusterKey} (${cluster.title})`);
  console.log(`  Topics: ${cluster.totalTopics} | Pages: ${cluster.pages.length} | ${statusSummary}`);

  if (cluster.pages.length) {
    console.log('  Published pages:');

    for (const page of cluster.pages.slice(0, 8)) {
      console.log(`    #${page.pageId} [${page.editorialIntent}] ${page.slug} (${page.editorialKey || 'sem editorialKey'})`);
    }
  }

  if (cluster.topics.length) {
    console.log('  Topics:');

    for (const topic of cluster.topics.slice(0, 8)) {
      console.log(
        `    #${topic.topicId} [${topic.status}/${topic.intent}] ${topic.keyword} ` +
        `(priority ${topic.priority}, ${topic.editorialKey || 'sem editorialKey'})`
      );
    }
  }

  console.log('');
};

const printSummary = (clusters) => {
  console.log('Topic Clusters');
  console.log('');
  console.log(`Total clusters: ${clusters.length}`);
  console.log('');

  for (const cluster of clusters) {
    printCluster(cluster);
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const app = await createStrapi().load();

  try {
    const clusters = await getTopicClusters(app, options);

    printSummary(clusters);
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
