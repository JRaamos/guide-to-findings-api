'use strict';

const {
  parseRankingChatCommand,
} = require('./chat-command-parser');

const DEFAULT_FETCH_LIMIT = 20;
const DEFAULT_DISPLAY_LIMIT = 10;
const MIN_DISPLAY_LIMIT = 5;
const MAX_DISPLAY_LIMIT = 20;
const DEFAULT_EDITORIAL_TEMPLATE = 'automatic';
const DEFAULT_EDITORIAL_INTENT = 'best';

const normalizeWhitespace = (value = '') => {
  if (value === null || value === undefined) {
    return '';
  }

  return value.toString().replace(/\s+/g, ' ').trim();
};

const normalizeTerm = (value = '') => {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const parsePositiveInteger = (value) => {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const normalizeDisplayLimit = ({ displayLimit, warnings }) => {
  const parsedLimit = parsePositiveInteger(displayLimit) || DEFAULT_DISPLAY_LIMIT;

  if (parsedLimit > MAX_DISPLAY_LIMIT) {
    warnings.push({
      code: 'displayLimit.max',
      message: `displayLimit limitado para ${MAX_DISPLAY_LIMIT}`,
      requestedLimit: parsedLimit,
    });

    return MAX_DISPLAY_LIMIT;
  }

  if (parsedLimit < MIN_DISPLAY_LIMIT) {
    warnings.push({
      code: 'displayLimit.min',
      message: `displayLimit aumentado para ${MIN_DISPLAY_LIMIT}`,
      requestedLimit: parsedLimit,
    });

    return MIN_DISPLAY_LIMIT;
  }

  return parsedLimit;
};

const normalizeFetchLimit = ({ fetchLimit, displayLimit, warnings }) => {
  const parsedLimit = parsePositiveInteger(fetchLimit) || DEFAULT_FETCH_LIMIT;
  let normalizedFetchLimit = parsedLimit;

  if (normalizedFetchLimit > MAX_DISPLAY_LIMIT) {
    warnings.push({
      code: 'fetchLimit.max',
      message: `fetchLimit limitado para ${MAX_DISPLAY_LIMIT}`,
      requestedLimit: normalizedFetchLimit,
    });
    normalizedFetchLimit = MAX_DISPLAY_LIMIT;
  }

  if (normalizedFetchLimit < displayLimit) {
    warnings.push({
      code: 'fetchLimit.minDisplay',
      message: 'fetchLimit ajustado para ser igual ao displayLimit',
      requestedLimit: normalizedFetchLimit,
      displayLimit,
    });
    normalizedFetchLimit = displayLimit;
  }

  return normalizedFetchLimit;
};

const buildMessageBase = (message) => {
  const parserResult = parseRankingChatCommand(message);

  return {
    source: 'message',
    rawMessage: parserResult.rawMessage,
    term: parserResult.term,
    fetchLimit: parserResult.fetchLimit,
    displayLimit: parserResult.displayLimit,
    editorialTemplate: parserResult.editorialTemplate,
    editorialIntent: parserResult.editorialIntent,
    intentModifier: parserResult.intentModifier,
    preferredSlug: parserResult.preferredSlug,
    titleHint: parserResult.titleHint,
    confidence: parserResult.confidence,
    warnings: parserResult.warnings || [],
    parserResult,
  };
};

const buildTermBase = ({
  term,
  limit,
  fetchLimit,
  displayLimit,
  editorialTemplate,
  editorialIntent,
  intentModifier,
  preferredSlug,
  titleHint,
}) => ({
  source: 'term',
  rawMessage: null,
  term: normalizeWhitespace(term),
  fetchLimit: fetchLimit || DEFAULT_FETCH_LIMIT,
  displayLimit: limit || displayLimit || DEFAULT_DISPLAY_LIMIT,
  editorialTemplate: editorialTemplate || DEFAULT_EDITORIAL_TEMPLATE,
  editorialIntent: editorialIntent || DEFAULT_EDITORIAL_INTENT,
  intentModifier: intentModifier || null,
  preferredSlug: preferredSlug || null,
  titleHint: titleHint || null,
  confidence: normalizeWhitespace(term) ? 'high' : 'low',
  warnings: [],
  parserResult: null,
});

const buildCommandContext = ({
  message,
  term,
  limit,
  fetchLimit,
  displayLimit,
  editorialTemplate,
  editorialIntent,
  intentModifier,
  preferredSlug,
  titleHint,
} = {}) => {
  const hasMessage = Boolean(normalizeWhitespace(message));
  const parsedBase = hasMessage
    ? buildMessageBase(message)
    : buildTermBase({
        term,
        limit,
        fetchLimit,
        displayLimit,
        editorialTemplate,
        editorialIntent,
        intentModifier,
        preferredSlug,
        titleHint,
      });
  const base = {
    ...parsedBase,
    term: normalizeWhitespace(term) || parsedBase.term,
    fetchLimit: fetchLimit || parsedBase.fetchLimit,
    displayLimit: displayLimit || parsedBase.displayLimit || limit,
    editorialTemplate: editorialTemplate || parsedBase.editorialTemplate,
    editorialIntent: editorialIntent || parsedBase.editorialIntent,
    intentModifier: intentModifier || parsedBase.intentModifier,
    preferredSlug: preferredSlug || parsedBase.preferredSlug,
    titleHint: titleHint || parsedBase.titleHint,
  };
  const warnings = [...(base.warnings || [])];
  const normalizedDisplayLimit = normalizeDisplayLimit({
    displayLimit: base.displayLimit,
    warnings,
  });
  const normalizedFetchLimit = normalizeFetchLimit({
    fetchLimit: base.fetchLimit,
    displayLimit: normalizedDisplayLimit,
    warnings,
  });
  const normalizedTerm = normalizeTerm(base.term);

  if (!normalizedTerm && !warnings.some((warning) => warning.code === 'term.empty')) {
    warnings.push({
      code: 'term.empty',
      message: 'Nao foi possivel identificar um termo de produto',
    });
  }

  return {
    source: base.source,
    rawMessage: base.rawMessage,
    term: base.term,
    normalizedTerm,
    fetchLimit: normalizedFetchLimit,
    displayLimit: normalizedDisplayLimit,
    productCount: normalizedDisplayLimit,
    editorialTemplate: base.editorialTemplate,
    editorialIntent: base.editorialIntent,
    intentModifier: base.intentModifier,
    preferredSlug: base.preferredSlug,
    titleHint: base.titleHint,
    confidence: base.confidence,
    warnings,
    parserResult: base.parserResult,
  };
};

module.exports = {
  buildCommandContext,
};
