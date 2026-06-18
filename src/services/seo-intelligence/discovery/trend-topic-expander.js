'use strict';

const { normalizeKeyword } = require('../keyword-discovery');

const BRAND_TERMS = new Set([
  'acer',
  'apple',
  'arno',
  'asus',
  'avell',
  'britania',
  'dell',
  'electrolux',
  'hp',
  'lenovo',
  'midea',
  'mondial',
  'multilaser',
  'ninja',
  'oster',
  'philco',
  'positivo',
  'samsung',
  'vaio',
  'walita',
  'xiaomi',
]);

const DOMAIN_RULES = [
  {
    name: 'tech',
    basePattern: /\b(notebook|computador|monitor|pc|cadeira gamer)\b/,
    foreignPattern: /\b(air fryer|fritadeira|cafeteira|batedeira|liquidificador|mamadeira|pneu)\b/,
    brands: new Set(['acer', 'apple', 'asus', 'avell', 'dell', 'hp', 'lenovo', 'multilaser', 'positivo', 'samsung', 'vaio', 'xiaomi']),
  },
  {
    name: 'homeKitchen',
    basePattern: /\b(air fryer|fritadeira|cafeteira|batedeira|liquidificador|eletrodomestico)\b/,
    foreignPattern: /\b(notebook|computador|monitor|pc gamer|mamadeira|pneu)\b/,
    brands: new Set(['arno', 'britania', 'electrolux', 'midea', 'mondial', 'ninja', 'oster', 'philco', 'samsung', 'walita']),
  },
];

const NON_EDITORIAL_PATTERNS = [
  /\b(batata|frango|receita)\b/,
  /\b(how to use|como usar|como fazer)\b/,
  /^na\s/,
];

const INVARIABLE_MODIFIERS = new Set([
  'gamer',
  'premium',
  'pro',
  'smart',
]);

const INTENT_RULES = [
  {
    intent: 'comparison',
    template: 'comparison',
    pattern: /\b(vs|versus|ou|comparativo|comparacao)\b/,
  },
  {
    intent: 'costBenefit',
    template: 'cost-benefit',
    pattern: /\b(barato|barata|custo[- ]beneficio|promocao|oferta|desconto)\b/,
  },
  {
    intent: 'useCase',
    template: 'automatic',
    pattern: /\b(gamer|estudo|estudar|trabalho|trabalhar|programacao|home office)\b/,
  },
  {
    intent: 'best',
    template: 'top-list',
    pattern: /\b(melhor|melhores|top)\b/,
  },
];

const cleanText = (value = '') => value.toString().replace(/\s+/g, ' ').trim().toLowerCase();

const getWords = (value = '') => normalizeKeyword(value).split(' ').filter(Boolean);

const pluralizeWord = (word) => {
  if (!word || word.endsWith('s')) {
    return word;
  }

  if (word.endsWith('r') || word.endsWith('z')) {
    return `${word}es`;
  }

  return `${word}s`;
};

const pluralizeTerm = (term) => {
  const words = getWords(term);

  if (!words.length) {
    return '';
  }

  if (words.join(' ') === 'air fryer') {
    return 'air fryers';
  }

  const pluralIndex = words.length > 1 && INVARIABLE_MODIFIERS.has(words[words.length - 1])
    ? words.length - 2
    : words.length - 1;

  words[pluralIndex] = pluralizeWord(words[pluralIndex]);

  return words.join(' ');
};

const includesBaseTerm = (trendKeyword, baseTerm) => {
  const normalizedTrend = ` ${normalizeKeyword(trendKeyword)} `;
  const normalizedBase = normalizeKeyword(baseTerm);
  const pluralBase = pluralizeTerm(baseTerm);

  return [normalizedBase, pluralBase]
    .filter(Boolean)
    .some((candidate) => normalizedTrend.includes(` ${candidate} `));
};

const inferEditorialFormat = (keyword) => {
  const normalizedKeyword = normalizeKeyword(keyword);
  const match = INTENT_RULES.find((rule) => rule.pattern.test(normalizedKeyword));

  return match
    ? { intent: match.intent, template: match.template }
    : { intent: 'useCase', template: 'automatic' };
};

const getDomainRule = (baseTerm) => {
  const normalizedBaseTerm = normalizeKeyword(baseTerm);

  return DOMAIN_RULES.find((rule) => rule.basePattern.test(normalizedBaseTerm)) || null;
};

const isRelevantToBase = ({ baseTerm, trendKeyword }) => {
  const normalizedKeyword = normalizeKeyword(trendKeyword);
  const words = getWords(normalizedKeyword);

  if (!words.length || words.length > 8 || NON_EDITORIAL_PATTERNS.some((pattern) => pattern.test(normalizedKeyword))) {
    return false;
  }

  const domainRule = getDomainRule(baseTerm);

  if (!domainRule) {
    return true;
  }

  if (domainRule.foreignPattern.test(normalizedKeyword)) {
    return false;
  }

  const detectedBrands = words.filter((word) => BRAND_TERMS.has(word));

  return !detectedBrands.length || detectedBrands.some((brand) => domainRule.brands.has(brand));
};

const isContextualizable = ({ baseTerm, trendKeyword }) => {
  const normalizedKeyword = normalizeKeyword(trendKeyword);
  const words = getWords(normalizedKeyword);

  if (!isRelevantToBase({ baseTerm, trendKeyword })) {
    return false;
  }

  if (words.length === 1) {
    const domainRule = getDomainRule(baseTerm);
    const allowedBrand = domainRule
      ? domainRule.brands.has(words[0])
      : BRAND_TERMS.has(words[0]);

    return allowedBrand || /\d/.test(words[0]) ||
      INTENT_RULES.some((rule) => rule.pattern.test(normalizedKeyword));
  }

  if (words.some((word) => BRAND_TERMS.has(word))) {
    return true;
  }

  if (/\d/.test(normalizedKeyword)) {
    return true;
  }

  return INTENT_RULES.some((rule) => rule.pattern.test(normalizedKeyword));
};

const replaceBaseWithPlural = (keyword, baseTerm) => {
  const normalizedKeyword = normalizeKeyword(keyword);
  const normalizedBase = normalizeKeyword(baseTerm);
  const pluralBase = pluralizeTerm(baseTerm);

  if (!normalizedBase || !pluralBase) {
    return normalizedKeyword;
  }

  const singularPattern = new RegExp(`(^|\\s)${normalizedBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`);

  return normalizedKeyword.replace(singularPattern, (match, prefix) => `${prefix}${pluralBase}`);
};

const normalizePriority = (trendScore) => {
  const score = Math.max(0, Math.min(100, Number(trendScore) || 0));

  return Math.round(50 + score * 0.3);
};

const createTopic = ({
  keyword,
  intent,
  template,
  priority,
  source,
  metadata,
}) => ({
  keyword,
  normalizedKeyword: normalizeKeyword(keyword),
  intent,
  template,
  priority,
  source,
  metadata,
});

const expandTrendKeyword = ({
  baseTerm,
  trendKeyword,
  trendScore,
  source = 'google_trends',
} = {}) => {
  const normalizedBaseTerm = normalizeKeyword(baseTerm);
  const cleanedTrendKeyword = cleanText(trendKeyword);

  if (!normalizedBaseTerm || !normalizeKeyword(cleanedTrendKeyword)) {
    return [];
  }

  const hasBaseTerm = includesBaseTerm(cleanedTrendKeyword, normalizedBaseTerm);

  if (!isRelevantToBase({ baseTerm: normalizedBaseTerm, trendKeyword: cleanedTrendKeyword })) {
    return [];
  }

  if (!hasBaseTerm && !isContextualizable({
    baseTerm: normalizedBaseTerm,
    trendKeyword: cleanedTrendKeyword,
  })) {
    return [];
  }

  const pluralBaseTerm = pluralizeTerm(normalizedBaseTerm);
  const contextualKeyword = hasBaseTerm
    ? normalizeKeyword(cleanedTrendKeyword)
    : `${pluralBaseTerm} ${normalizeKeyword(cleanedTrendKeyword)}`;
  const baseComesFirst = [normalizedBaseTerm, pluralBaseTerm]
    .filter(Boolean)
    .some((candidate) => contextualKeyword === candidate || contextualKeyword.startsWith(`${candidate} `));
  const format = inferEditorialFormat(contextualKeyword);
  const metadata = {
    baseTerm: normalizedBaseTerm,
    trendKeyword: cleanedTrendKeyword,
    trendScore: Math.max(0, Math.min(100, Number(trendScore) || 0)),
  };
  const priority = normalizePriority(trendScore);
  const candidates = [
    createTopic({
      keyword: contextualKeyword,
      ...format,
      priority,
      source,
      metadata: { ...metadata, expansion: hasBaseTerm ? 'direct' : 'contextualized' },
    }),
  ];

  if (format.intent === 'useCase' && (!hasBaseTerm || baseComesFirst)) {
    const bestKeyword = `melhores ${replaceBaseWithPlural(contextualKeyword, normalizedBaseTerm)}`;

    candidates.push(
      createTopic({
        keyword: bestKeyword,
        intent: 'best',
        template: 'top-list',
        priority,
        source,
        metadata: { ...metadata, expansion: 'best-variant' },
      })
    );
  }

  const byNormalizedKeyword = new Map();

  for (const topic of candidates) {
    if (topic.normalizedKeyword && !byNormalizedKeyword.has(topic.normalizedKeyword)) {
      byNormalizedKeyword.set(topic.normalizedKeyword, topic);
    }
  }

  return [...byNormalizedKeyword.values()];
};

module.exports = {
  expandTrendKeyword,
};
