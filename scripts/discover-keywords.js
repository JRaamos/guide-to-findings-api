'use strict';

const {
  discoverKeywords,
} = require('../src/services/seo-intelligence/keyword-discovery');

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

const { term, maxResults } = parseArgs(process.argv.slice(2));
const keywords = discoverKeywords({
  term,
  maxResults,
});

console.log('Keyword Discovery');
console.log('');
console.log(`Term: ${term}`);
console.log(`Total: ${keywords.length}`);
console.log('');

for (const item of keywords) {
  console.log(`[${item.intent}] ${item.keyword}`);
}
