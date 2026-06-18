'use strict';

require('dotenv').config();

const { createStrapi } = require('@strapi/strapi');
const {
  importTrendTopics,
} = require('../src/services/seo-intelligence/discovery/trend-topic-import');

const DEFAULT_TERM = 'notebook';

const parseArgs = (args) => {
  const maxResultsFlagIndex = args.findIndex((arg) => arg === '--max' || arg === '--maxResults');
  let maxResults;
  let termParts = [...args];

  if (maxResultsFlagIndex >= 0) {
    maxResults = Number(args[maxResultsFlagIndex + 1]);
    termParts = args.filter((_, index) => index !== maxResultsFlagIndex && index !== maxResultsFlagIndex + 1);
  }

  return {
    baseTerm: termParts.join(' ').trim() || DEFAULT_TERM,
    maxResults,
  };
};

const printSummary = (result) => {
  console.log('Trend Topic Import');
  console.log('');
  console.log(`Base term: ${result.baseTerm}`);
  console.log(`Source: ${result.source}`);
  console.log(`Discovered: ${result.discovered}`);
  console.log(`Expanded: ${result.expanded}`);
  console.log(`Discarded: ${result.discarded}`);
  console.log(`Created: ${result.persistence.created}`);
  console.log(`Updated: ${result.persistence.updated}`);
  console.log(`Skipped: ${result.persistence.skipped}`);
  console.log('');

  for (const topic of result.persistence.topics.slice(0, 40)) {
    console.log(
      `[${topic.action}] #${topic.id} ${topic.normalizedKeyword} ` +
      `(${topic.intent}, ${topic.status}, priority ${topic.priority})`
    );
  }

  if (result.warnings.length) {
    console.log('');
    console.log('Warnings:');

    for (const warning of result.warnings) {
      console.log(`- ${warning.keyword}: ${warning.reason}`);
    }
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const app = await createStrapi().load();

  try {
    const result = await importTrendTopics({
      strapi: app,
      ...options,
    });

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
        status: error.status || null,
      },
      null,
      2
    )
  );
  process.exit(1);
});
