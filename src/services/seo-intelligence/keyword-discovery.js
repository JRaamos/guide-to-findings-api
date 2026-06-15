'use strict';

const DEFAULT_MAX_RESULTS = 50;
const MIN_PRIORITY = 1;

const INTENT_PRIORITIES = {
  best: 100,
  costBenefit: 90,
  buyingGuide: 80,
  comparison: 70,
  useCase: 60,
};

const INVARIABLE_TRAILING_TERMS = new Set([
  'gamer',
  'premium',
  'plus',
  'pro',
  'smart',
]);

const TECH_PATTERNS = [
  /\binformatica\b/,
  /\bcomputador/,
  /\bnotebooks?\b/,
  /\bmonitores?\b/,
  /\bpc\b/,
  /\bgamer\b/,
  /\bprogramacao\b/,
  /\bhome office\b/,
];

const HOME_KITCHEN_PATTERNS = [
  /\bcasa\b/,
  /\bcozinha\b/,
  /\beletrodomesticos?\b/,
  /\bair fryers?\b/,
  /\bfritadeiras?\b/,
  /\bbatedeiras?\b/,
  /\bcafeteiras?\b/,
  /\bliquidificadores?\b/,
];

const BABY_PATTERNS = [
  /\bbebes?\b/,
  /\binfantil\b/,
  /\bmamadeiras?\b/,
  /\bcarrinhos?\b/,
  /\bbercos?\b/,
];

const VEHICLE_PATTERNS = [
  /\bveiculos?\b/,
  /\bacessorios?\b/,
  /\bcarros?\b/,
  /\bpneus?\b/,
  /\bmotos?\b/,
  /\bautomotivo\b/,
];

const EDITORIAL_TERM_NORMALIZATIONS = new Map([
  ['pc game', 'pc gamer'],
  ['pc games', 'pc gamer'],
  ['computador game', 'computador gamer'],
  ['cadeira game', 'cadeira gamer'],
  ['cadeiras game', 'cadeiras gamer'],
]);

const normalizeWhitespace = (value = '') => {
  if (value === null || value === undefined) {
    return '';
  }

  return value.toString().replace(/\s+/g, ' ').trim();
};

const removeAccents = (value = '') => {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const normalizeKeyword = (keyword = '') => {
  return removeAccents(keyword)
    .toLowerCase()
    .replace(/\s*-\s*/g, '-')
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeTerm = (term = '') => {
  const normalizedTerm = normalizeKeyword(term);

  return EDITORIAL_TERM_NORMALIZATIONS.get(normalizedTerm) || normalizedTerm;
};

const getWords = (term = '') => {
  return normalizeWhitespace(term).split(' ').filter(Boolean);
};

const singularizeWord = (word) => {
  if (!word) {
    return word;
  }

  if (word === 'pneus') {
    return 'pneu';
  }

  if (word.endsWith('oes')) {
    return `${word.slice(0, -3)}ao`;
  }

  if (word.endsWith('res')) {
    return word.slice(0, -2);
  }

  if (word.endsWith('es') && word.length > 4) {
    return word.slice(0, -2);
  }

  if (word.endsWith('s') && word.length > 3) {
    return word.slice(0, -1);
  }

  return word;
};

const singularizeTerm = (term = '') => {
  if (term.endsWith('air fryers')) {
    return term.replace(/air fryers$/, 'air fryer');
  }

  const words = getWords(term);

  if (!words.length) {
    return term;
  }

  const lastWord = words[words.length - 1];

  if (INVARIABLE_TRAILING_TERMS.has(lastWord) && words.length > 1) {
    words[words.length - 2] = singularizeWord(words[words.length - 2]);

    return words.join(' ');
  }

  words[words.length - 1] = singularizeWord(lastWord);

  return words.join(' ');
};

const matchesAny = (value, patterns) => {
  return patterns.some((pattern) => pattern.test(value));
};

const inferDomains = ({ term, categoryName, categorySlug }) => {
  const searchableText = normalizeKeyword([term, categoryName, categorySlug].filter(Boolean).join(' '));
  const domains = new Set();

  if (matchesAny(searchableText, TECH_PATTERNS)) {
    domains.add('tech');
  }

  if (matchesAny(searchableText, HOME_KITCHEN_PATTERNS)) {
    domains.add('homeKitchen');
  }

  if (matchesAny(searchableText, BABY_PATTERNS)) {
    domains.add('baby');
  }

  if (matchesAny(searchableText, VEHICLE_PATTERNS)) {
    domains.add('vehicle');
  }

  return domains;
};

const getPriority = ({ intent, keyword }) => {
  const basePriority = INTENT_PRIORITIES[intent] || 50;
  const lengthPenalty = Math.max(0, normalizeKeyword(keyword).split(' ').length - 5) * 3;

  return Math.max(MIN_PRIORITY, basePriority - lengthPenalty);
};

const createKeyword = ({ keyword, intent, template, source = 'deterministic-template', metadata = {} }) => ({
  keyword: normalizeWhitespace(keyword),
  normalizedKeyword: normalizeKeyword(keyword),
  intent,
  template,
  priority: getPriority({ intent, keyword }),
  source,
  metadata,
});

const getBaseTemplates = ({ term, singularTerm }) => [
  { keyword: `melhores ${term}`, intent: 'best', template: 'top-list' },
  { keyword: `${term} custo-benefício`, intent: 'costBenefit', template: 'cost-benefit' },
  { keyword: `${term} barato`, intent: 'costBenefit', template: 'cost-benefit' },
  { keyword: `qual ${singularTerm} comprar`, intent: 'buyingGuide', template: 'buying-guide' },
  { keyword: `guia de compra de ${term}`, intent: 'buyingGuide', template: 'buying-guide' },
  { keyword: `comparativo de ${term}`, intent: 'comparison', template: 'comparison' },
  { keyword: `top 10 ${term}`, intent: 'best', template: 'top-list' },
  { keyword: `ranking de ${term}`, intent: 'best', template: 'top-list' },
  { keyword: `${term} vale a pena`, intent: 'buyingGuide', template: 'buying-guide' },
  { keyword: `${term} recomendado`, intent: 'best', template: 'top-list' },
];

const getDomainTemplates = ({ term, domains }) => {
  const templates = [];

  if (domains.has('tech')) {
    const shouldAddGamerUseCase = !/\bgamer\b/.test(term);

    templates.push(
      { keyword: `${term} para estudar`, intent: 'useCase', template: 'automatic', metadata: { useCase: 'estudar' } },
      { keyword: `${term} para trabalhar`, intent: 'useCase', template: 'automatic', metadata: { useCase: 'trabalhar' } },
      { keyword: `${term} para programação`, intent: 'useCase', template: 'automatic', metadata: { useCase: 'programacao' } },
      { keyword: `${term} para home office`, intent: 'useCase', template: 'automatic', metadata: { useCase: 'homeOffice' } }
    );

    if (shouldAddGamerUseCase) {
      templates.push({ keyword: `${term} gamer`, intent: 'useCase', template: 'automatic', metadata: { useCase: 'gamer' } });
    }
  }

  if (domains.has('homeKitchen')) {
    templates.push(
      { keyword: `${term} para cozinha`, intent: 'useCase', template: 'automatic', metadata: { useCase: 'cozinha' } },
      { keyword: `${term} econômico`, intent: 'costBenefit', template: 'cost-benefit' },
      { keyword: `${term} compacto`, intent: 'useCase', template: 'automatic', metadata: { attribute: 'compacto' } },
      { keyword: `${term} potente`, intent: 'useCase', template: 'automatic', metadata: { attribute: 'potente' } }
    );
  }

  if (domains.has('baby')) {
    templates.push(
      { keyword: `${term} para bebê`, intent: 'useCase', template: 'automatic', metadata: { useCase: 'bebe' } },
      { keyword: `${term} segura`, intent: 'useCase', template: 'automatic', metadata: { attribute: 'segura' } },
      { keyword: `${term} confortável`, intent: 'useCase', template: 'automatic', metadata: { attribute: 'confortavel' } }
    );
  }

  if (domains.has('vehicle')) {
    templates.push(
      { keyword: `${term} para carro`, intent: 'useCase', template: 'automatic', metadata: { useCase: 'carro' } },
      { keyword: `${term} custo-benefício`, intent: 'costBenefit', template: 'cost-benefit' },
      { keyword: `${term} durável`, intent: 'useCase', template: 'automatic', metadata: { attribute: 'duravel' } }
    );
  }

  return templates;
};

const getProductTemplates = ({ products, singularTerm }) => {
  return products
    .map((product) => product?.brand || product?.manufacturer || product?.product?.brand)
    .filter(Boolean)
    .map(normalizeTerm)
    .filter(Boolean)
    .slice(0, 5)
    .map((brand) => ({
      keyword: `${singularTerm} ${brand} vale a pena`,
      intent: 'buyingGuide',
      template: 'buying-guide',
      source: 'product-derived-template',
      metadata: { brand },
    }));
};

const dedupeAndSort = (keywords) => {
  const byNormalizedKeyword = new Map();

  for (const keyword of keywords) {
    if (!keyword.normalizedKeyword) {
      continue;
    }

    const existing = byNormalizedKeyword.get(keyword.normalizedKeyword);

    if (!existing || keyword.priority > existing.priority) {
      byNormalizedKeyword.set(keyword.normalizedKeyword, keyword);
    }
  }

  return [...byNormalizedKeyword.values()].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    return a.normalizedKeyword.localeCompare(b.normalizedKeyword);
  });
};

const discoverKeywords = ({
  term,
  categoryName,
  categorySlug,
  products = [],
  maxResults = DEFAULT_MAX_RESULTS,
} = {}) => {
  const normalizedTerm = normalizeTerm(term || categoryName || categorySlug);

  if (!normalizedTerm) {
    return [];
  }

  const singularTerm = singularizeTerm(normalizedTerm);
  const domains = inferDomains({
    term: normalizedTerm,
    categoryName,
    categorySlug,
  });
  const candidates = [
    ...getBaseTemplates({ term: normalizedTerm, singularTerm }),
    ...getDomainTemplates({ term: normalizedTerm, domains }),
    ...getProductTemplates({ products, singularTerm }),
  ].map(createKeyword);
  const limit = Number.isInteger(Number(maxResults)) && Number(maxResults) > 0
    ? Number(maxResults)
    : DEFAULT_MAX_RESULTS;

  return dedupeAndSort(candidates).slice(0, limit);
};

module.exports = {
  discoverKeywords,
  normalizeKeyword,
};
