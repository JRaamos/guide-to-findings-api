'use strict';

const ALLOWED_LIMITS = new Set([5, 10, 15, 20]);
const ALLOWED_TEMPLATES = new Set([
  'automatic',
  'top-list',
  'cost-benefit',
  'buying-guide',
  'comparison',
]);
const ALLOWED_INTENTS = new Set(['best', 'costBenefit', 'comparison', 'generic']);
const DEFAULT_LIMIT = 10;
const DEFAULT_TEMPLATE = 'automatic';
const DEFAULT_SOURCE_MARKETPLACE = 'mercadoLivre';
const MAX_TITLE_LENGTH = 70;
const MAX_SLUG_LENGTH = 60;
const MARKETPLACE_SLUG_PATTERNS = [
  /\bmercado-livre\b/g,
  /\bmercadolivre\b/g,
  /\bmlb\b/g,
];
const MARKETPLACE_TEXT_PATTERNS = [
  /\bmercado\s+livre\b/gi,
  /\bmercadolivre\b/gi,
  /\bmlb\b/gi,
];
const YEAR_PATTERN = /\b20\d{2}\b/g;
const DATE_PATTERN = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g;
const COST_BENEFIT_PATTERN = /\bcusto\s*-?\s*beneficio\b|\bcusto\s*-?\s*benefício\b/i;
const COMPARISON_PATTERN = /\bcomparativo\b|\bcomparacao\b|\bcomparação\b|\bversus\b|\bvs\b/i;
const FEMININE_TERMS = new Set([
  'air fryer',
  'air fryers',
  'furadeira',
  'furadeiras',
  'mamadeira',
  'mamadeiras',
]);

const normalizeWhitespace = (value = '') => {
  if (value === null || value === undefined) {
    return '';
  }

  return value.toString().replace(/\s+/g, ' ').trim();
};

const removeAccents = (value = '') => {
  if (value === null || value === undefined) {
    return '';
  }

  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const normalizeSearchText = (value = '') => {
  return removeAccents(normalizeWhitespace(value)).toLowerCase();
};

const stripUnsafeEditorialText = (value = '') => {
  return normalizeWhitespace(
    value
      .toString()
      .replace(YEAR_PATTERN, '')
      .replace(DATE_PATTERN, '')
      .replace(MARKETPLACE_TEXT_PATTERNS[0], '')
      .replace(MARKETPLACE_TEXT_PATTERNS[1], '')
      .replace(MARKETPLACE_TEXT_PATTERNS[2], '')
  );
};

const slugify = (value = '') => {
  return removeAccents(value)
    .toLowerCase()
    .replace(YEAR_PATTERN, '')
    .replace(DATE_PATTERN, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
};

const truncateSlug = (slug) => {
  if (slug.length <= MAX_SLUG_LENGTH) {
    return slug;
  }

  const truncated = slug.slice(0, MAX_SLUG_LENGTH).replace(/-[^-]*$/, '');

  return truncated || slug.slice(0, MAX_SLUG_LENGTH);
};

const normalizeSlug = (value = '') => {
  let slug = slugify(value);

  for (const pattern of MARKETPLACE_SLUG_PATTERNS) {
    slug = slug.replace(pattern, '');
  }

  return truncateSlug(slug.replace(/^-+|-+$/g, '').replace(/-+/g, '-'));
};

const normalizeLimit = (limit) => {
  const parsedLimit = Number(limit);

  return ALLOWED_LIMITS.has(parsedLimit) ? parsedLimit : DEFAULT_LIMIT;
};

const normalizeTemplate = (template) => {
  return ALLOWED_TEMPLATES.has(template) ? template : DEFAULT_TEMPLATE;
};

const normalizeIntent = (intent) => {
  return ALLOWED_INTENTS.has(intent) ? intent : null;
};

const inferIntent = ({ normalizedTerm, template }) => {
  if (template === 'comparison' || COMPARISON_PATTERN.test(normalizedTerm)) {
    return 'comparison';
  }

  if (template === 'cost-benefit' || COST_BENEFIT_PATTERN.test(normalizedTerm)) {
    return 'costBenefit';
  }

  if (template === 'buying-guide') {
    return 'generic';
  }

  return 'best';
};

const singularizeLastWord = (term) => {
  if (term.endsWith('air fryers')) {
    return term.replace(/air fryers$/, 'air fryer');
  }

  const words = term.split(' ').filter(Boolean);
  const lastWord = words[words.length - 1];

  if (!lastWord) {
    return term;
  }

  if (lastWord.endsWith('s') && lastWord.length > 3) {
    words[words.length - 1] = lastWord.slice(0, -1);
  }

  return words.join(' ');
};

const pluralizeLastWord = (term) => {
  if (term.endsWith('air fryer')) {
    return term.replace(/air fryer$/, 'air fryers');
  }

  const words = term.split(' ').filter(Boolean);
  const lastWord = words[words.length - 1];

  if (!lastWord || lastWord.endsWith('s')) {
    return term;
  }

  if (lastWord.endsWith('m')) {
    words[words.length - 1] = `${lastWord.slice(0, -1)}ns`;
  } else if (lastWord.endsWith('r') || lastWord.endsWith('z')) {
    words[words.length - 1] = `${lastWord}es`;
  } else {
    words[words.length - 1] = `${lastWord}s`;
  }

  return words.join(' ');
};

const removeIntentWords = (normalizedTerm) => {
  return normalizeWhitespace(
    normalizedTerm
      .replace(COST_BENEFIT_PATTERN, '')
      .replace(COMPARISON_PATTERN, '')
      .replace(/\bmelhores?\b/g, '')
      .replace(/\btop\b/g, '')
      .replace(/\bcomprar\b/g, '')
  );
};

const buildProductTerm = (normalizedTerm) => {
  const baseTerm = removeIntentWords(normalizedTerm);

  return baseTerm || normalizedTerm;
};

const getArticle = (pluralTerm) => {
  const lastWord = pluralTerm.split(' ').filter(Boolean).pop() || '';

  if (FEMININE_TERMS.has(pluralTerm) || FEMININE_TERMS.has(lastWord)) {
    return 'As';
  }

  return lastWord.endsWith('as') ? 'As' : 'Os';
};

const buildTitleHint = ({ productTerm, productCount, intent }) => {
  const pluralTerm = pluralizeLastWord(productTerm);

  if (intent === 'costBenefit') {
    return `Melhores ${pluralTerm} custo-benefício`;
  }

  if (intent === 'comparison') {
    return `Comparativo de ${pluralTerm} para comprar`;
  }

  return `${getArticle(pluralTerm)} ${productCount} melhores ${pluralTerm} para comprar`;
};

const buildSlugHint = ({ normalizedTerm, productTerm, intent, preferredSlug }) => {
  const safePreferredSlug = normalizeSlug(preferredSlug);

  if (safePreferredSlug) {
    return safePreferredSlug;
  }

  if (intent === 'costBenefit') {
    return normalizeSlug(`melhores ${pluralizeLastWord(productTerm)} custo beneficio`);
  }

  if (intent === 'comparison') {
    return normalizeSlug(`comparativo ${pluralizeLastWord(productTerm)}`);
  }

  if (COST_BENEFIT_PATTERN.test(normalizedTerm)) {
    return normalizeSlug(`melhores ${pluralizeLastWord(productTerm)} custo beneficio`);
  }

  return normalizeSlug(`melhores ${pluralizeLastWord(productTerm)}`);
};

const buildFocusKeyword = ({ productTerm, intent }) => {
  const pluralTerm = pluralizeLastWord(productTerm);

  if (intent === 'costBenefit') {
    return `melhores ${pluralTerm} custo-benefício`;
  }

  if (intent === 'comparison') {
    return `comparativo de ${pluralTerm}`;
  }

  return `melhores ${pluralTerm}`;
};

const buildSecondaryKeywords = ({ productTerm, intent }) => {
  const singularTerm = singularizeLastWord(productTerm);
  const pluralTerm = pluralizeLastWord(productTerm);
  const keywords = [
    `qual ${singularTerm} comprar`,
    `${pluralTerm} para comprar`,
  ];

  if (intent !== 'costBenefit') {
    keywords.unshift(`${singularTerm} custo-benefício`);
  }

  if (intent !== 'comparison') {
    keywords.push(`comparativo de ${pluralTerm}`);
  }

  return [...new Set(keywords)].slice(0, 4);
};

const buildSourceDisclosure = (sourceMarketplace) => {
  if (sourceMarketplace === DEFAULT_SOURCE_MARKETPLACE) {
    return 'Produtos selecionados com base em rankings e dados disponíveis no Mercado Livre.';
  }

  return 'Produtos selecionados com base em rankings e dados disponíveis na fonte marketplace informada.';
};

const buildEditorialPlan = ({
  term,
  limit = DEFAULT_LIMIT,
  template = DEFAULT_TEMPLATE,
  editorialIntent = null,
  preferredSlug = null,
  sourceMarketplace = DEFAULT_SOURCE_MARKETPLACE,
} = {}) => {
  const originalTerm = normalizeWhitespace(term);
  const safeTerm = stripUnsafeEditorialText(originalTerm);
  const normalizedTerm = normalizeSearchText(safeTerm);
  const productCount = normalizeLimit(limit);
  const safeTemplate = normalizeTemplate(template);
  const validIntent = normalizeIntent(editorialIntent);
  const intent = validIntent || inferIntent({
    normalizedTerm,
    template: safeTemplate,
  });
  const productTerm = buildProductTerm(normalizedTerm);
  const titleHint = buildTitleHint({
    productTerm,
    productCount,
    intent,
  }).slice(0, MAX_TITLE_LENGTH);
  const slugHint = buildSlugHint({
    normalizedTerm,
    productTerm,
    intent,
    preferredSlug,
  });

  return {
    term: originalTerm,
    normalizedTerm,
    productCount,
    template: safeTemplate,
    intent,
    titleHint,
    slugHint,
    focusKeyword: buildFocusKeyword({
      productTerm,
      intent,
    }),
    secondaryKeywords: buildSecondaryKeywords({
      productTerm,
      intent,
    }),
    sourceDisclosure: buildSourceDisclosure(sourceMarketplace),
    constraints: {
      avoidMarketplaceInTitle: true,
      avoidYear: true,
      maxTitleLength: MAX_TITLE_LENGTH,
      maxSlugLength: MAX_SLUG_LENGTH,
    },
  };
};

module.exports = {
  buildEditorialPlan,
};
