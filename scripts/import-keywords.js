'use strict';

require('dotenv').config();

const { createStrapi } = require('@strapi/strapi');
const {
  discoverKeywords,
} = require('../src/services/seo-intelligence/keyword-discovery');
const {
  persistEditorialTopics,
} = require('../src/services/seo-intelligence/topic-persist');

const DEFAULT_TERM = 'notebooks';

const parseArgs = (args) => {
  const maxResultsFlagIndex = args.findIndex((arg) => arg === '--max' || arg === '--maxResults');
  let maxResults;
  let termParts = [...args];

  if (maxResultsFlagIndex >= 0) {
    maxResults = Number(args[maxResultsFlagIndex + 1]);
    termParts = args.filter((_, index) => index !== maxResultsFlagIndex && index !== maxResultsFlagIndex + 1);
  }

  return {
    term: termParts.join(' ').trim() || DEFAULT_TERM,
    maxResults,
  };
};

const printSummary = ({ term, discovered, result }) => {
  console.log('Keyword Import');
  console.log('');
  console.log(`Term: ${term}`);
  console.log(`Discovered: ${discovered}`);
  console.log(`Created: ${result.created}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log('');

  for (const topic of result.topics.slice(0, 20)) {
    console.log(`[${topic.action}] #${topic.id} ${topic.normalizedKeyword} (${topic.status}, priority ${topic.priority})`);
  }
};

const main = async () => {
  const { term, maxResults } = parseArgs(process.argv.slice(2));
  const app = await createStrapi().load();

  try {
    const topics = discoverKeywords({
      term,
      maxResults,
    });
    const result = await persistEditorialTopics({
      strapi: app,
      topics,
      sourceTerm: term,
      sourceMarketplace: 'mercadoLivre',
    });

    printSummary({
      term,
      discovered: topics.length,
      result,
    });
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
