'use strict';

const {
  buildEditorialKey,
} = require('./editorial-key');

const ALLOWED_LIMITS = new Set([5, 10, 15, 20]);
const ALLOWED_TEMPLATES = new Set([
  'automatic',
  'top-list',
  'cost-benefit',
  'buying-guide',
  'comparison',
]);
const ALLOWED_INTENTS = new Set(['best', 'costBenefit', 'gamer', 'comparison', 'buyingGuide', 'useCase', 'generic']);
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
  'batedeira',
  'batedeiras',
  'cadeira',
  'cadeiras',
  'cafeteira',
  'cafeteiras',
  'furadeira',
  'furadeiras',
  'mamadeira',
  'mamadeiras',
]);
const INVARIABLE_TRAILING_TERMS = new Set([
  'gamer',
  'premium',
  'plus',
  'pro',
  'smart',
]);
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

const normalizeEditorialTerm = (value = '') => {
  const normalizedTerm = normalizeSearchText(value);

  return EDITORIAL_TERM_NORMALIZATIONS.get(normalizedTerm) || normalizedTerm;
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

const getWords = (term = '') => {
  return term.split(' ').filter(Boolean);
};

const pluralizeWord = (word) => {
  if (!word || word.endsWith('s')) {
    return word;
  }

  if (word.endsWith('m')) {
    return `${word.slice(0, -1)}ns`;
  }

  if (word.endsWith('r') || word.endsWith('z')) {
    return `${word}es`;
  }

  return `${word}s`;
};

const formatTitleTerm = (term) => {
  return term
    .replace(/\bpcs gamer\b/g, 'PCs gamer')
    .replace(/\bpc gamer\b/g, 'PC gamer');
};

const looksPlural = (term) => {
  const words = getWords(term);
  const lastWord = words[words.length - 1];

  if (!lastWord) {
    return false;
  }

  return lastWord.endsWith('s') || words.slice(0, -1).some((word) => word.endsWith('s'));
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
    return 'buyingGuide';
  }

  return 'best';
};

const singularizeLastWord = (term) => {
  return term;
};

const pluralizeLastWord = (term) => {
  if (term.endsWith('air fryer')) {
    return term.replace(/air fryer$/, 'air fryers');
  }

  if (looksPlural(term)) {
    return term;
  }

  const words = getWords(term);
  const lastWord = words[words.length - 1];

  if (!lastWord) {
    return term;
  }

  if (INVARIABLE_TRAILING_TERMS.has(lastWord) && words.length > 1) {
    words[words.length - 2] = pluralizeWord(words[words.length - 2]);

    return words.join(' ');
  }

  words[words.length - 1] = pluralizeWord(lastWord);

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
  const words = getWords(pluralTerm);
  const firstWord = words[0] || '';
  const lastWord = words[words.length - 1] || '';

  if (
    FEMININE_TERMS.has(pluralTerm) ||
    FEMININE_TERMS.has(firstWord) ||
    FEMININE_TERMS.has(lastWord)
  ) {
    return 'As';
  }

  return firstWord.endsWith('as') || lastWord.endsWith('as') ? 'As' : 'Os';
};

const buildTitleHint = ({ productTerm, productCount, intent }) => {
  const pluralTerm = formatTitleTerm(pluralizeLastWord(productTerm));

  if (intent === 'costBenefit') {
    return `Melhores ${pluralTerm} custo-benefício`;
  }

  if (intent === 'gamer') {
    return `${getArticle(pluralTerm)} ${productCount} melhores ${pluralTerm} gamer`;
  }

  if (intent === 'comparison') {
    return `Comparativo de ${pluralTerm}: veja qual escolher`;
  }

  if (intent === 'buyingGuide' || intent === 'generic') {
    return `Guia de compra: como escolher ${pluralTerm}`;
  }

  if (intent === 'useCase') {
    return `${getArticle(pluralTerm)} ${productCount} melhores ${pluralTerm} para comprar`;
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

  if (intent === 'gamer') {
    return normalizeSlug(`melhores ${pluralizeLastWord(productTerm)} gamer`);
  }

  if (intent === 'comparison') {
    return normalizeSlug(`comparativo ${pluralizeLastWord(productTerm)}`);
  }

  if (intent === 'buyingGuide' || intent === 'generic') {
    return normalizeSlug(`guia ${pluralizeLastWord(productTerm)}`);
  }

  if (intent === 'useCase') {
    return normalizeSlug(`melhores ${pluralizeLastWord(productTerm)}`);
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

  if (intent === 'gamer') {
    return `melhores ${pluralTerm} gamer`;
  }

  if (intent === 'comparison') {
    return `comparativo de ${pluralTerm}`;
  }

  if (intent === 'buyingGuide' || intent === 'generic') {
    return `guia de ${pluralTerm}`;
  }

  if (intent === 'useCase') {
    return `melhores ${pluralTerm}`;
  }

  return `melhores ${pluralTerm}`;
};

const buildSecondaryKeywords = ({ productTerm, intent }) => {
  const pluralTerm = pluralizeLastWord(productTerm);
  const keywords = [
    `como escolher ${pluralTerm}`,
    `${pluralTerm} para comprar`,
  ];

  if (intent !== 'costBenefit') {
    keywords.unshift(`${pluralTerm} custo-benefício`);
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
  commandContext = null,
  term,
  limit = DEFAULT_LIMIT,
  template = DEFAULT_TEMPLATE,
  editorialIntent = null,
  preferredSlug = null,
  sourceMarketplace = DEFAULT_SOURCE_MARKETPLACE,
} = {}) => {
  const contextTerm = commandContext?.term || term;
  const contextLimit = commandContext?.productCount || commandContext?.displayLimit || limit;
  const contextTemplate = commandContext?.editorialTemplate || template;
  const contextIntent = commandContext?.editorialIntent || editorialIntent;
  const contextIntentModifier = commandContext?.intentModifier || null;
  const contextPreferredSlug = commandContext?.preferredSlug || preferredSlug;
  const contextTitleHint = commandContext?.titleHint || null;
  const originalTerm = normalizeWhitespace(contextTerm);
  const safeTerm = stripUnsafeEditorialText(originalTerm);
  const normalizedTerm = normalizeEditorialTerm(safeTerm);
  const productCount = normalizeLimit(contextLimit);
  const safeTemplate = normalizeTemplate(contextTemplate);
  const validIntent = normalizeIntent(contextIntent);
  const intent = validIntent || inferIntent({
    normalizedTerm,
    template: safeTemplate,
  });
  const productTerm = buildProductTerm(normalizedTerm);
  const titleHint = normalizeWhitespace(contextTitleHint) || buildTitleHint({
    productTerm,
    productCount,
    intent,
  });
  const slugHint = buildSlugHint({
    normalizedTerm,
    productTerm,
    intent,
    preferredSlug: contextPreferredSlug,
  });
  const editorialKey = buildEditorialKey({
    term: productTerm || normalizedTerm,
    normalizedTerm,
    intent,
    intentModifier: contextIntentModifier,
  });

  return {
    term: originalTerm,
    normalizedTerm,
    productCount,
    template: safeTemplate,
    intent,
    intentModifier: contextIntentModifier,
    editorialKey,
    titleHint: titleHint.slice(0, MAX_TITLE_LENGTH),
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
