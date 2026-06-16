'use strict';

const MARKETPLACE_PATTERN = /\bmercado\s+livre\b|\bmercadolivre\b|\bmlb\b/gi;
const YEAR_PATTERN = /\b20\d{2}\b/g;
const DATE_PATTERN = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g;
const COST_BENEFIT_PATTERN = /\bcusto\s*-?\s*beneficio\b|\bcusto\s*-?\s*benefício\b|\bbaratos?\b|\bbons\s+e\s+baratos\b/gi;
const COMPARISON_PATTERN = /\bcomparativo\b|\bcomparacao\b|\bcomparação\b|\bversus\b|\bvs\b/gi;
const BEST_WORDS = /\b(?:melhor|melhores|top|ranking|comprar|compra|qual|quais|mais|vendido|vendidos|vendida|vendidas|guia|escolha|sua|seu|para|os|as|o|a|de|do|da|dos|das|em|no|na|nos|nas)\b/g;
const GENERIC_WORDS = /\b(?:para|com|sem|e)\b/g;
const INTENT_ALIASES = new Map([
  ['generic', 'buyingGuide'],
  ['buying-guide', 'buyingGuide'],
  ['cost-benefit', 'costBenefit'],
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

const normalizeKeyText = (value = '') => {
  return removeAccents(value)
    .toLowerCase()
    .replace(YEAR_PATTERN, '')
    .replace(DATE_PATTERN, '')
    .replace(MARKETPLACE_PATTERN, '')
    .replace(/[-_]+/g, ' ')
    .replace(MARKETPLACE_PATTERN, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

const singularizeEditorialTerm = (term = '') => {
  const normalizedTerm = normalizeKeyText(term);

  if (normalizedTerm.endsWith('air fryers')) {
    return normalizedTerm.replace(/air fryers$/, 'air fryer');
  }

  const words = normalizedTerm.split(' ').filter(Boolean);

  if (!words.length) {
    return '';
  }

  return [...new Set(words.map(singularizeWord))].join(' ');
};

const normalizeIntent = (intent = '') => {
  const safeIntent = normalizeWhitespace(intent);

  return INTENT_ALIASES.get(safeIntent) || safeIntent || 'best';
};

const extractUseCaseModifier = (value = '') => {
  const normalized = normalizeKeyText(value);
  const match = normalized.match(/\bpara\s+([a-z0-9][a-z0-9\s]{1,40})\b/);

  if (!match) {
    return null;
  }

  const modifier = match[1]
    .replace(BEST_WORDS, ' ')
    .replace(COST_BENEFIT_PATTERN, ' ')
    .replace(COMPARISON_PATTERN, ' ')
    .replace(/\b(?:comprar|ranking|top|melhores?)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return modifier || null;
};

const normalizeModifier = (modifier = '') => {
  return normalizeKeyText(modifier)
    .replace(BEST_WORDS, ' ')
    .replace(GENERIC_WORDS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const buildComparisonModifier = (term = '') => {
  const normalized = normalizeKeyText(term);
  const parts = normalized
    .split(/\b(?:ou|vs|versus)\b/)
    .map((part) => singularizeEditorialTerm(part.replace(COMPARISON_PATTERN, ' ')))
    .filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  return parts.join('-vs-');
};

const buildEditorialTermKey = ({
  term,
  normalizedTerm,
  intent,
  intentModifier,
} = {}) => {
  const sourceTerm = normalizeKeyText(normalizedTerm || term);
  const useCaseModifier = normalizeModifier(intentModifier) || extractUseCaseModifier(sourceTerm);
  const baseTerm = sourceTerm
    .replace(COST_BENEFIT_PATTERN, ' ')
    .replace(COMPARISON_PATTERN, ' ')
    .replace(useCaseModifier ? new RegExp(`\\bpara\\s+${useCaseModifier}\\b`, 'g') : /\b__never__\b/g, ' ')
    .replace(BEST_WORDS, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const termKey = singularizeEditorialTerm(baseTerm || sourceTerm);

  if (intent === 'comparison') {
    return buildComparisonModifier(sourceTerm) || termKey;
  }

  return termKey;
};

const buildEditorialKey = ({
  term,
  normalizedTerm,
  intent,
  intentModifier,
} = {}) => {
  const normalizedIntent = normalizeIntent(intent);
  const termKey = buildEditorialTermKey({
    term,
    normalizedTerm,
    intent: normalizedIntent,
    intentModifier,
  });

  if (!termKey) {
    return null;
  }

  if (normalizedIntent === 'useCase') {
    const modifier = normalizeModifier(intentModifier) || extractUseCaseModifier(normalizedTerm || term);

    return modifier ? `${termKey}:${normalizedIntent}:${modifier}` : `${termKey}:${normalizedIntent}`;
  }

  if (normalizedIntent === 'comparison') {
    const modifier = buildComparisonModifier(normalizedTerm || term);

    return modifier ? `${termKey}:${normalizedIntent}:${modifier}` : `${termKey}:${normalizedIntent}`;
  }

  return `${termKey}:${normalizedIntent}`;
};

module.exports = {
  buildEditorialKey,
  buildEditorialTermKey,
  normalizeKeyText,
  normalizeIntent,
  singularizeEditorialTerm,
};
