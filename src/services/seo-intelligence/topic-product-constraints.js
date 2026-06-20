'use strict';

const KNOWN_BRANDS = [
  { name: 'ASUS', aliases: ['asus'] },
  { name: 'Acer', aliases: ['acer'] },
  { name: 'Apple', aliases: ['apple'] },
  { name: 'Arno', aliases: ['arno'] },
  { name: 'Britânia', aliases: ['britania'] },
  { name: 'Dell', aliases: ['dell'] },
  { name: 'Electrolux', aliases: ['electrolux'] },
  { name: 'HP', aliases: ['hp', 'hewlett packard'] },
  { name: 'Lenovo', aliases: ['lenovo'] },
  { name: 'LG', aliases: ['lg'] },
  { name: 'Mancer', aliases: ['mancer'] },
  { name: 'Mondial', aliases: ['mondial'] },
  { name: 'Motorola', aliases: ['motorola'] },
  { name: 'Multilaser', aliases: ['multilaser'] },
  { name: 'Oster', aliases: ['oster'] },
  { name: 'Philco', aliases: ['philco'] },
  { name: 'Philips Walita', aliases: ['philips walita', 'walita'] },
  { name: 'Positivo', aliases: ['positivo'] },
  { name: 'Samsung', aliases: ['samsung'] },
  { name: 'Vaio', aliases: ['vaio'] },
  { name: 'WAP', aliases: ['wap'] },
  { name: 'Xiaomi', aliases: ['xiaomi'] },
];

const normalizeConstraintText = (value = '') => {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
};

const containsNormalizedPhrase = (text, phrase) => {
  const normalizedText = normalizeConstraintText(text);
  const normalizedPhrase = normalizeConstraintText(phrase);

  return Boolean(normalizedText && normalizedPhrase) &&
    ` ${normalizedText} `.includes(` ${normalizedPhrase} `);
};

const formatBrandName = (value) => {
  const text = typeof value === 'string' ? value.trim() : '';

  if (!text) {
    return '';
  }

  if (text.length <= 4 && text === text.toUpperCase()) {
    return text;
  }

  return text
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|\s)\S/g, (character) => character.toLocaleUpperCase('pt-BR'));
};

const buildBrandCandidates = (brands = []) => {
  const candidates = new Map();

  for (const brand of KNOWN_BRANDS) {
    candidates.set(normalizeConstraintText(brand.name), brand);
  }

  for (const value of brands) {
    const name = typeof value === 'string' ? value.trim() : '';
    const normalizedName = normalizeConstraintText(name);

    if (!normalizedName || candidates.has(normalizedName)) {
      continue;
    }

    candidates.set(normalizedName, {
      name: formatBrandName(name),
      aliases: [name],
    });
  }

  return [...candidates.values()].sort((first, second) => {
    const firstLength = Math.max(...first.aliases.map((alias) => normalizeConstraintText(alias).length));
    const secondLength = Math.max(...second.aliases.map((alias) => normalizeConstraintText(alias).length));

    return secondLength - firstLength;
  });
};

const detectTopicProductConstraint = ({ keyword, title, topic, brands = [] } = {}) => {
  const topicText = [keyword, title, topic]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ');

  if (!topicText) {
    return null;
  }

  for (const brand of buildBrandCandidates(brands)) {
    const matchedAlias = brand.aliases.find((alias) => containsNormalizedPhrase(topicText, alias));

    if (matchedAlias) {
      return {
        type: 'brand',
        brand: brand.name,
        normalizedBrand: normalizeConstraintText(brand.name),
        matchedAlias: normalizeConstraintText(matchedAlias),
        label: `Restrição detectada: marca ${brand.name}`,
        warning: `Esta página só deve usar produtos ${brand.name}.`,
      };
    }
  }

  return null;
};

const getProductConstraintFields = (item = {}) => {
  const product = item.product || item.rankingProduct || {};

  return [
    product.brand,
    item.brandSnapshot,
    product.name,
    product.title,
    item.titleSnapshot,
  ];
};

const productMatchesConstraint = (item, constraint) => {
  if (!constraint || constraint.type !== 'brand') {
    return true;
  }

  const brand = KNOWN_BRANDS.find(
    (candidate) => normalizeConstraintText(candidate.name) === constraint.normalizedBrand
  );
  const aliases = brand?.aliases || [constraint.brand];

  return getProductConstraintFields(item).some((field) => {
    return aliases.some((alias) => containsNormalizedPhrase(field, alias));
  });
};

const applyTopicProductConstraints = ({ items = [], keyword, title, topic, displayLimit } = {}) => {
  const brands = items.flatMap((item) => [item.product?.brand, item.brandSnapshot]).filter(Boolean);
  const constraint = detectTopicProductConstraint({ keyword, title, topic, brands });

  if (!constraint) {
    return {
      constraint: null,
      items,
      blockedItems: [],
      validationError: null,
    };
  }

  const allowedItems = [];
  const blockedItems = [];

  for (const item of items) {
    if (productMatchesConstraint(item, constraint)) {
      allowedItems.push(item);
    } else {
      blockedItems.push(item);
    }
  }

  const requiredProducts = Number(displayLimit) || 0;
  const validationError = allowedItems.length < requiredProducts
    ? {
        code: 'topicProductConstraints.brand.insufficientProducts',
        message: `Produtos insuficientes para a marca ${constraint.brand}`,
        brand: constraint.brand,
        availableProducts: allowedItems.length,
        requiredProducts,
      }
    : null;

  return {
    constraint,
    items: allowedItems,
    blockedItems,
    validationError,
  };
};

module.exports = {
  applyTopicProductConstraints,
  containsNormalizedPhrase,
  detectTopicProductConstraint,
  normalizeConstraintText,
  productMatchesConstraint,
};
