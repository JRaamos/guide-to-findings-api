'use strict';

const TOP_LIMIT = 10;

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

const normalizeText = (value = '') => {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const getProductText = (product) => {
  const attributes = product?.attributes ? JSON.stringify(product.attributes) : '';

  return normalizeText(
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

const getProductIdentity = (product, index) => {
  return String(
    product?.id ||
      product?.productId ||
      product?.marketplaceProductId ||
      product?.sourceId ||
      product?.name ||
      product?.title ||
      `product-${index + 1}`
  );
};

const normalizeIntent = (intent, keyword) => {
  const normalizedIntent = normalizeText(intent).replace(/[\s_-]/g, '');
  const normalizedKeyword = normalizeText(keyword);

  if (['costbenefit', 'custobeneficio'].includes(normalizedIntent)) {
    return 'costBenefit';
  }

  if (['gamer', 'gaming'].includes(normalizedIntent)) {
    return 'gamer';
  }

  if (['estudar', 'estudo', 'study'].includes(normalizedIntent)) {
    return 'estudar';
  }

  if (['trabalho', 'work'].includes(normalizedIntent)) {
    return 'trabalho';
  }

  if (normalizedIntent === 'usecase') {
    if (/gamer|gaming/.test(normalizedKeyword)) return 'gamer';
    if (/estud|faculdade|escola/.test(normalizedKeyword)) return 'estudar';
    if (/trabal|profissional|empresa/.test(normalizedKeyword)) return 'trabalho';
  }

  return 'best';
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
  const reviewCount = toNumber(product?.reviewCount) || 0;

  if (!rating) return 0;

  const ratingValue = clamp((rating / 5) * 100);
  const reviewConfidence = Math.min(1, Math.log10(reviewCount + 1) / 3);
  return ratingValue * (0.7 + reviewConfidence * 0.3);
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

const buildSignals = ({ text, discountPercent, priceScore, ratingScore }) => {
  const signals = [];

  if (priceScore >= 60) signals.push('preco abaixo da faixa superior');
  if (discountPercent > 0) signals.push(`desconto de ${discountPercent}%`);
  if (ratingScore > 0) signals.push('avaliacao disponivel');
  if (getGpuScore(text) > 0) signals.push('GPU dedicada ou sinal gamer');
  if (getRamScore(text) > 0) signals.push('RAM identificada');
  if (getCpuScore(text) > 0) signals.push('processador identificado');
  if (getSsdScore(text) > 0) signals.push('SSD identificado');
  if (/\b(?:leve|ultrafino|ultra\s*fino|slim|compacto|portatil)\b/.test(text)) {
    signals.push('portabilidade');
  }
  if (/\b(?:bateria|autonomia|mah|wh)\b/.test(text)) signals.push('bateria/autonomia');

  return signals;
};

const scoreProduct = (product, context) => {
  const text = getProductText(product);
  const price = toNumber(product?.price);
  const priceScore = getPriceScore(price, context.minimumPrice, context.maximumPrice);
  const discountPercent = getDiscountPercent(product);
  const discountScore = clamp(discountPercent * 3);
  const ratingScore = getRatingScore(product);
  const popularityScore = clamp(
    ((context.totalProducts - product.originalPosition + 1) / context.totalProducts) * 100
  );
  const gpuScore = getGpuScore(text);
  const ramScore = getRamScore(text);
  const cpuScore = getCpuScore(text);
  const ssdScore = getSsdScore(text);
  const portabilityScore = /\b(?:leve|ultrafino|ultra\s*fino|slim|compacto|portatil)\b/.test(
    text
  )
    ? 100
    : 0;
  const batteryScore = /\b(?:bateria|autonomia|mah|wh)\b/.test(text) ? 100 : 0;
  let score;

  switch (context.intent) {
    case 'costBenefit':
      score =
        priceScore * 0.45 + discountScore * 0.25 + ratingScore * 0.2 + popularityScore * 0.1;
      break;
    case 'gamer':
      score = gpuScore * 0.4 + ramScore * 0.25 + cpuScore * 0.25 + popularityScore * 0.1;
      break;
    case 'estudar':
      score =
        priceScore * 0.4 +
        portabilityScore * 0.2 +
        batteryScore * 0.2 +
        ratingScore * 0.1 +
        popularityScore * 0.1;
      break;
    case 'trabalho':
      score = ramScore * 0.3 + ssdScore * 0.25 + cpuScore * 0.25 + ratingScore * 0.1 + popularityScore * 0.1;
      break;
    default:
      score = popularityScore;
  }

  return {
    ...product,
    simulatorScore: round(score),
    discountPercent,
    signals: buildSignals({ text, discountPercent, priceScore, ratingScore }),
  };
};

const summarizeProduct = (product, simulatedPosition = null) => ({
  position: simulatedPosition ?? product.originalPosition,
  originalPosition: product.originalPosition,
  productId: product.id || product.productId || null,
  marketplaceProductId: product.marketplaceProductId || null,
  name: product.name || product.title || null,
  price: toNumber(product.price),
  oldPrice: toNumber(product.oldPrice ?? product.originalPrice),
  discountPercent: product.discountPercent ?? getDiscountPercent(product),
  rating: toNumber(product.rating),
  reviewCount: toNumber(product.reviewCount),
  simulatorScore: product.simulatorScore ?? null,
  signals: product.signals || [],
});

const simulateIntentRanking = ({ intent, keyword = '', products = [] } = {}) => {
  if (!Array.isArray(products)) {
    throw new TypeError('products must be an array');
  }

  const resolvedIntent = normalizeIntent(intent, keyword);
  const orderedProducts = products
    .map((product, index) => ({
      ...product,
      originalPosition: toNumber(product?.position) || index + 1,
      simulatorIdentity: getProductIdentity(product, index),
    }))
    .sort((left, right) => left.originalPosition - right.originalPosition);
  const prices = orderedProducts.map((product) => toNumber(product.price)).filter((price) => price > 0);
  const context = {
    intent: resolvedIntent,
    minimumPrice: prices.length ? Math.min(...prices) : 0,
    maximumPrice: prices.length ? Math.max(...prices) : 0,
    totalProducts: Math.max(orderedProducts.length, 1),
  };
  const scoredProducts = orderedProducts.map((product) => scoreProduct(product, context));
  const simulatedProducts =
    resolvedIntent === 'best'
      ? scoredProducts
      : [...scoredProducts].sort((left, right) => {
          return right.simulatorScore - left.simulatorScore || left.originalPosition - right.originalPosition;
        });
  const original = orderedProducts.slice(0, TOP_LIMIT);
  const simulated = simulatedProducts.slice(0, TOP_LIMIT);
  const comparisonLength = Math.max(original.length, simulated.length);
  let changedPositions = 0;

  for (let index = 0; index < comparisonLength; index += 1) {
    if (original[index]?.simulatorIdentity !== simulated[index]?.simulatorIdentity) {
      changedPositions += 1;
    }
  }

  const originalIdentities = new Set(original.map((product) => product.simulatorIdentity));
  const simulatedIdentities = new Set(simulated.map((product) => product.simulatorIdentity));
  const intersectionSize = [...originalIdentities].filter((identity) =>
    simulatedIdentities.has(identity)
  ).length;
  const unionSize = new Set([...originalIdentities, ...simulatedIdentities]).size;
  const similarityScore = unionSize ? round(intersectionSize / unionSize) : 1;

  return {
    intent: resolvedIntent,
    keyword,
    totalProducts: orderedProducts.length,
    originalTop10: original.map((product) => summarizeProduct(product)),
    simulatedTop10: simulated.map((product, index) => summarizeProduct(product, index + 1)),
    changedPositions,
    similarityScore,
  };
};

module.exports = {
  simulateIntentRanking,
};
