'use strict';

const { buildEditorialPlan } = require('../src/services/editorial-intelligence/editorial-plan');

const DEFAULT_EXAMPLES = [
  { term: 'notebook', limit: 10 },
  { term: 'furadeira', limit: 10 },
  { term: 'air fryer', limit: 10 },
  { term: 'mamadeira', limit: 5 },
  { term: 'notebook custo beneficio', limit: 10 },
];

const parseArgs = (args) => {
  if (!args.length) {
    return DEFAULT_EXAMPLES;
  }

  const maybeLimit = Number(args[args.length - 1]);
  const hasLimit = Number.isInteger(maybeLimit);
  const termParts = hasLimit ? args.slice(0, -1) : args;
  const term = termParts.join(' ').trim();

  return [
    {
      term,
      limit: hasLimit ? maybeLimit : undefined,
    },
  ];
};

const plans = parseArgs(process.argv.slice(2)).map((payload) => buildEditorialPlan(payload));

console.log(JSON.stringify(plans.length === 1 ? plans[0] : plans, null, 2));
