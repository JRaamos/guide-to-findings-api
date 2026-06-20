'use strict';

const { normalizeIntent, normalizeKeyText } = require('../editorial-intelligence/editorial-key');

const clamp = (value, minimum = 0, maximum = 100) => {
  return Math.min(maximum, Math.max(minimum, value));
};

const round = (value, decimals = 2) => {
  const multiplier = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getProductText = (product) => {
  const attributes = product?.attributes ? JSON.stringify(product.attributes) : '';

  return normalizeKeyText(
    [
      product?.name,
      product?.title,
      product?.brand,
      product?.model,
      product?.description,
      product?.shortDescription,
      attributes,
    ]
      .filter(Boolean)
      .join(' ')
  );
};

const getDiscountPercent = (product) => {
  const price = toNumber(product?.price);
  const oldPrice = toNumber(product?.oldPrice ?? product?.originalPrice);

  if (!price || !oldPrice || oldPrice <= price) {
    return 0;
  }

  return round(((oldPrice - price) / oldPrice) * 100);
};

const getPriceScore = (price, minimumPrice, maximumPrice) => {
  if (!price) return 0;
  if (minimumPrice === maximumPrice) return 50;
  return clamp(((maximumPrice - price) / (maximumPrice - minimumPrice)) * 100);
};

const getRatingScore = (product) => {
  const rating = toNumber(product?.rating);
  return rating ? clamp((rating / 5) * 100) : 0;
};

const getReviewCountScore = (product, maximumReviewCount) => {
  const reviewCount = toNumber(product?.reviewCount) || 0;

  if (!reviewCount || !maximumReviewCount) return 0;
  return clamp(Math.log10(reviewCount + 1) / Math.log10(maximumReviewCount + 1) * 100);
};

const getRamScore = (text) => {
  const matches = [
    ...text.matchAll(/(\d{1,3})\s*gb\s*(?:de\s*)?(?:ram|memoria)/g),
    ...text.matchAll(/(?:ram|memoria)[^0-9]{0,12}(\d{1,3})\s*gb/g),
    ...text.matchAll(/(\d{1,3})\s*gb\s*ddr[345]?/g),
    ...text.matchAll(/(?:i[3579]|ryzen\s*[3579])[^0-9]{0,12}(\d{1,3})\s*gb/g),
  ];
  const values = matches.map((match) => Number(match[1])).filter(Number.isFinite);
  const ram = values.length ? Math.max(...values) : null;

  return ram ? clamp((ram / 32) * 100) : 0;
};

const getCpuScore = (text) => {
  if (/\b(?:i9|ryzen\s*9)\b/.test(text)) return 100;
  if (/\b(?:i7|ryzen\s*7)\b/.test(text)) return 85;
  if (/\b(?:i5|ryzen\s*5)\b/.test(text)) return 70;
  if (/\b(?:i3|ryzen\s*3)\b/.test(text)) return 45;
  if (/\bryzen\b/.test(text)) return 55;
  return 0;
};

const getGpuScore = (text) => {
  if (/\brtx\s*\d{3,4}\b/.test(text)) return 100;
  if (/\b(?:gtx\s*\d{3,4}|radeon\s*rx)\b/.test(text)) return 80;
  if (/\b(?:geforce|gpu|placa\s+de\s+video|video\s+dedicad)\b/.test(text)) return 65;
  return 0;
};

const getSsdScore = (text) => {
  const match = text.match(/(?:ssd[^0-9]{0,10}(\d+)\s*(tb|gb)|(\d+)\s*(tb|gb)[^a-z]{0,5}ssd)/);

  if (!match) return /\bssd\b/.test(text) ? 60 : 0;

  const capacity = Number(match[1] || match[3]);
  const unit = match[2] || match[4];
  const capacityGb = unit === 'tb' ? capacity * 1024 : capacity;
  return clamp((capacityGb / 1024) * 100, 35, 100);
};

const contribution = ({ value, weight, reason }) => ({
  value: round(value),
  weight,
  contribution: round(value * weight),
  reason,
});

const resolveStrategy = ({ intent, keyword, intentModifier }) => {
  const normalizedIntent = normalizeIntent(intent);
  const normalizedKeyword = normalizeKeyText(keyword);
  const normalizedModifier = normalizeKeyText(intentModifier);

  if (normalizedIntent === 'costBenefit') return 'costBenefit';
  if (
    normalizedIntent === 'gamer' ||
    /\b(?:gamer|gaming|jogos?)\b/.test(normalizedKeyword) ||
    (normalizedIntent === 'useCase' && /\b(?:gamer|gaming|jogar|jogos?)\b/.test(normalizedModifier))
  ) {
    return 'gamer';
  }

  return 'best';
};

const buildCostBenefitBreakdown = (signals) => ({
  price: contribution({
    value: signals.price,
    weight: 0.4,
    reason: 'Favorece precos menores dentro do conjunto elegivel',
  }),
  discount: contribution({
    value: signals.discount,
    weight: 0.2,
    reason: `Desconto identificado: ${signals.discountPercent}%`,
  }),
  rating: contribution({
    value: signals.rating,
    weight: 0.2,
    reason: 'Favorece melhor avaliacao quando disponivel',
  }),
  reviewCount: contribution({
    value: signals.reviewCount,
    weight: 0.1,
    reason: 'Usa volume de reviews como sinal de confiabilidade',
  }),
  marketplacePosition: contribution({
    value: signals.marketplacePosition,
    weight: 0.1,
    reason: 'Preserva influencia limitada da posicao original do marketplace',
  }),
});

const buildGamerBreakdown = (signals) => ({
  gamerSignal: contribution({
    value: signals.gamerSignal,
    weight: 0.15,
    reason: 'Titulo ou atributos possuem sinal gamer explicito',
  }),
  gpu: contribution({
    value: signals.gpu,
    weight: 0.3,
    reason: 'Favorece GPU dedicada RTX, GTX ou Radeon RX',
  }),
  ram: contribution({
    value: signals.ram,
    weight: 0.2,
    reason: 'Favorece maior capacidade de memoria RAM identificada',
  }),
  processor: contribution({
    value: signals.processor,
    weight: 0.15,
    reason: 'Favorece Intel Core i5/i7/i9 e AMD Ryzen',
  }),
  ssd: contribution({
    value: signals.ssd,
    weight: 0.1,
    reason: 'Favorece armazenamento SSD identificado',
  }),
  marketplacePosition: contribution({
    value: signals.marketplacePosition,
    weight: 0.1,
    reason: 'Preserva influencia limitada da posicao original do marketplace',
  }),
});

const buildBestBreakdown = (signals) => ({
  marketplacePosition: contribution({
    value: signals.marketplacePosition,
    weight: 1,
    reason: 'Ordem original do Mercado Livre preservada para este intent',
  }),
});

const sumBreakdown = (breakdown) => {
  return round(
    Object.values(breakdown).reduce((total, item) => total + item.contribution, 0)
  );
};

const rankProductsForIntent = ({
  intent,
  keyword = '',
  products = [],
  intentModifier = null,
} = {}) => {
  if (!Array.isArray(products)) {
    throw new TypeError('products must be an array');
  }

  const strategy = resolveStrategy({ intent, keyword, intentModifier });
  const orderedProducts = products
    .map((product, index) => ({
      product,
      originalPosition: toNumber(product?.position) || index + 1,
      inputIndex: index,
    }))
    .sort((left, right) => left.originalPosition - right.originalPosition);
  const prices = orderedProducts
    .map(({ product }) => toNumber(product.price))
    .filter((price) => price > 0);
  const reviewCounts = orderedProducts
    .map(({ product }) => toNumber(product.reviewCount))
    .filter((reviewCount) => reviewCount > 0);
  const minimumPrice = prices.length ? Math.min(...prices) : 0;
  const maximumPrice = prices.length ? Math.max(...prices) : 0;
  const maximumReviewCount = reviewCounts.length ? Math.max(...reviewCounts) : 0;
  const totalProducts = Math.max(orderedProducts.length, 1);
  const scored = orderedProducts.map(({ product, originalPosition, inputIndex }) => {
    const text = getProductText(product);
    const discountPercent = getDiscountPercent(product);
    const signals = {
      price: getPriceScore(toNumber(product.price), minimumPrice, maximumPrice),
      discount: clamp(discountPercent * 3),
      discountPercent,
      rating: getRatingScore(product),
      reviewCount: getReviewCountScore(product, maximumReviewCount),
      gamerSignal: /\b(?:gamer|gaming)\b/.test(text) ? 100 : 0,
      gpu: getGpuScore(text),
      ram: getRamScore(text),
      processor: getCpuScore(text),
      ssd: getSsdScore(text),
      marketplacePosition: clamp(((totalProducts - originalPosition + 1) / totalProducts) * 100),
    };
    const scoreBreakdown = strategy === 'costBenefit'
      ? buildCostBenefitBreakdown(signals)
      : strategy === 'gamer'
        ? buildGamerBreakdown(signals)
        : buildBestBreakdown(signals);

    return {
      product,
      originalPosition,
      editorialPosition: originalPosition,
      intentScore: sumBreakdown(scoreBreakdown),
      scoreBreakdown,
      strategy,
      inputIndex,
    };
  });
  const ranked = strategy === 'best'
    ? scored
    : [...scored].sort((left, right) => {
        return right.intentScore - left.intentScore || left.originalPosition - right.originalPosition;
      });

  return ranked.map(({ inputIndex, ...item }, index) => ({
    ...item,
    editorialPosition: index + 1,
  }));
};

module.exports = {
  rankProductsForIntent,
};
