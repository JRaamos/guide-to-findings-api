'use strict';

require('dotenv').config();

const {
  discoverSearchDemand,
} = require('../src/services/seo-intelligence/discovery/search-demand-engine');

const DEFAULT_TERM = 'notebook';

const parseArgs = (args) => {
  const options = {
    geo: 'BR',
    maxResults: 20,
    timeframe: 'today 12-m',
  };
  const termParts = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--max') {
      options.maxResults = args[index + 1];
      index += 1;
    } else if (argument === '--geo') {
      options.geo = args[index + 1];
      index += 1;
    } else if (argument === '--timeframe') {
      options.timeframe = args[index + 1];
      index += 1;
    } else {
      termParts.push(argument);
    }
  }

  return {
    ...options,
    term: termParts.join(' ').trim() || DEFAULT_TERM,
  };
};

const main = async () => {
  const result = await discoverSearchDemand(parseArgs(process.argv.slice(2)));

  console.log(JSON.stringify(result, null, 2));
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
