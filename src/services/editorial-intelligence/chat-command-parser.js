'use strict';

const DEFAULT_FETCH_LIMIT = 20;
const DEFAULT_DISPLAY_LIMIT = 10;
const MIN_DISPLAY_LIMIT = 5;
const MAX_DISPLAY_LIMIT = 20;

const TEMPLATE_PATTERNS = {
  comparison: /\bcomparar\b|\bcomparativo\b|\bcomparacao\b|\bcomparação\b/i,
  buyingGuide: /\bguia\b|\bcomo\s+escolher\b|\bqual\s+comprar\b/i,
  topList: /\btop\b|\branking\b|\bmelhores?\b/i,
};
const INTENT_PATTERNS = {
  comparison: TEMPLATE_PATTERNS.comparison,
  costBenefit: /\bcusto\s*-?\s*beneficio\b|\bcusto\s*-?\s*benefício\b|\bbarato\b|\bbaratos\b|\bbons\s+e\s+baratos\b|\bmais\s+barato\b/i,
  useCase: /\bpara\s+([a-z0-9À-ÿ][a-z0-9À-ÿ\s-]{1,40})/i,
  best: /\bmelhores?\b|\btop\b|\branking\b/i,
};
const OPERATIONAL_WORDS = new Set([
  'quero',
  'fazer',
  'faz',
  'criar',
  'cria',
  'gera',
  'gerar',
  'uma',
  'um',
  'os',
  'as',
  'o',
  'a',
  'de',
  'do',
  'da',
  'dos',
  'das',
  'com',
  'ranking',
  'top',
  'melhores',
  'melhor',
  'comparar',
  'comparativo',
  'comparacao',
  'comparação',
  'guia',
  'pagina',
  'página',
  'qual',
  'comprar',
]);
const INTENT_WORDS = new Set([
  'custo',
  'beneficio',
  'benefício',
  'barato',
  'baratos',
  'bons',
  'mais',
]);
const FEMININE_TERMS = new Set([
  'air fryer',
  'air fryers',
  'cafeteira',
  'cafeteiras',
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
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const normalizeComparableText = (value = '') => {
  return removeAccents(value).toLowerCase();
};

const slugify = (value = '') => {
  return removeAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
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

const getArticle = (pluralTerm) => {
  const lastWord = pluralTerm.split(' ').filter(Boolean).pop() || '';

  if (FEMININE_TERMS.has(pluralTerm) || FEMININE_TERMS.has(lastWord)) {
    return 'As';
  }

  return lastWord.endsWith('as') ? 'As' : 'Os';
};

const parseDisplayLimit = (message, warnings) => {
  const match = message.match(/\b(\d{1,3})\b/);

  if (!match) {
    return DEFAULT_DISPLAY_LIMIT;
  }

  const requestedLimit = Number(match[1]);

  if (requestedLimit > MAX_DISPLAY_LIMIT) {
    warnings.push({
      code: 'displayLimit.max',
      message: `displayLimit limitado para ${MAX_DISPLAY_LIMIT}`,
      requestedLimit,
    });

    return MAX_DISPLAY_LIMIT;
  }

  if (requestedLimit < 3) {
    warnings.push({
      code: 'displayLimit.min',
      message: `displayLimit aumentado para ${MIN_DISPLAY_LIMIT}`,
      requestedLimit,
    });

    return MIN_DISPLAY_LIMIT;
  }

  return requestedLimit;
};

const getEditorialTemplate = (message, hasNumber) => {
  if (TEMPLATE_PATTERNS.comparison.test(message)) {
    return 'comparison';
  }

  if (TEMPLATE_PATTERNS.buyingGuide.test(message)) {
    return 'buying-guide';
  }

  if (TEMPLATE_PATTERNS.topList.test(message) || hasNumber) {
    return 'top-list';
  }

  return 'automatic';
};

const getEditorialIntent = (message) => {
  if (INTENT_PATTERNS.comparison.test(message)) {
    return 'comparison';
  }

  if (INTENT_PATTERNS.costBenefit.test(message)) {
    return 'costBenefit';
  }

  if (INTENT_PATTERNS.useCase.test(message)) {
    return 'useCase';
  }

  return 'best';
};

const extractIntentModifier = (message, editorialIntent) => {
  if (editorialIntent !== 'useCase') {
    return null;
  }

  const match = message.match(INTENT_PATTERNS.useCase);

  if (!match) {
    return null;
  }

  const modifier = normalizeComparableText(match[1])
    .split(' ')
    .filter((token) => !OPERATIONAL_WORDS.has(token))
    .join(' ');

  return normalizeWhitespace(modifier) || null;
};

const stripUseCaseModifier = (message, intentModifier) => {
  if (!intentModifier) {
    return message;
  }

  return message.replace(new RegExp(`\\bpara\\s+${intentModifier}\\b`, 'i'), ' ');
};

const extractTerm = ({ message, intentModifier }) => {
  const normalizedMessage = stripUseCaseModifier(normalizeComparableText(message), intentModifier)
    .replace(/\b\d{1,3}\b/g, ' ')
    .replace(/[-]+/g, ' ');
  const tokens = normalizedMessage
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !OPERATIONAL_WORDS.has(token))
    .filter((token) => !INTENT_WORDS.has(token));

  return normalizeWhitespace(tokens.join(' '));
};

const getConfidence = (term) => {
  if (!term) {
    return 'low';
  }

  if (term.length <= 2) {
    return 'medium';
  }

  return 'high';
};

const buildPreferredSlug = ({ term, editorialIntent, intentModifier }) => {
  if (!term) {
    return null;
  }

  const pluralTerm = pluralizeLastWord(term);

  if (editorialIntent === 'comparison') {
    return slugify(`comparativo ${pluralTerm}`);
  }

  if (editorialIntent === 'costBenefit') {
    return slugify(`melhores ${pluralTerm} custo beneficio`);
  }

  if (editorialIntent === 'useCase' && intentModifier) {
    return slugify(`melhores ${pluralTerm} para ${intentModifier}`);
  }

  return slugify(`melhores ${pluralTerm}`);
};

const buildTitleHint = ({ term, displayLimit, editorialIntent, intentModifier }) => {
  if (!term) {
    return null;
  }

  const pluralTerm = pluralizeLastWord(term);

  if (editorialIntent === 'comparison') {
    return `Comparativo de ${pluralTerm}`;
  }

  if (editorialIntent === 'costBenefit') {
    return `Melhores ${pluralTerm} custo-benefício`;
  }

  if (editorialIntent === 'useCase' && intentModifier) {
    return `${getArticle(pluralTerm)} ${displayLimit} melhores ${pluralTerm} para ${intentModifier}`;
  }

  return `${getArticle(pluralTerm)} ${displayLimit} melhores ${pluralTerm} para comprar`;
};

const buildWarnings = ({ warnings, term, rawMessage }) => {
  const nextWarnings = [...warnings];

  if (!term) {
    nextWarnings.push({
      code: 'term.empty',
      message: 'Nao foi possivel identificar um termo de produto',
    });
  }

  if (normalizeComparableText(rawMessage).split(/\s+/).filter(Boolean).length <= 2 && !term) {
    nextWarnings.push({
      code: 'message.generic',
      message: 'Mensagem muito generica para interpretar com seguranca',
    });
  }

  return nextWarnings;
};

const parseRankingChatCommand = (message) => {
  const rawMessage = normalizeWhitespace(message);
  const normalizedMessage = normalizeComparableText(rawMessage);
  const warnings = [];
  const displayLimit = parseDisplayLimit(normalizedMessage, warnings);
  const hasNumber = /\b\d{1,3}\b/.test(normalizedMessage);
  const editorialTemplate = getEditorialTemplate(normalizedMessage, hasNumber);
  const editorialIntent = getEditorialIntent(normalizedMessage);
  const intentModifier = extractIntentModifier(normalizedMessage, editorialIntent);
  const term = extractTerm({
    message: normalizedMessage,
    intentModifier,
  });
  const finalWarnings = buildWarnings({
    warnings,
    term,
    rawMessage,
  });

  return {
    rawMessage,
    term,
    fetchLimit: DEFAULT_FETCH_LIMIT,
    displayLimit,
    editorialTemplate,
    editorialIntent,
    intentModifier,
    preferredSlug: buildPreferredSlug({
      term,
      editorialIntent,
      intentModifier,
    }),
    titleHint: buildTitleHint({
      term,
      displayLimit,
      editorialIntent,
      intentModifier,
    }),
    confidence: getConfidence(term),
    warnings: finalWarnings,
  };
};

module.exports = {
  parseRankingChatCommand,
};
