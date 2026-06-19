'use strict';

const {
  buildEditorialKey,
  buildEditorialTermKey,
  normalizeIntent,
  normalizeKeyText,
} = require('../editorial-intelligence/editorial-key');

const uid = {
  editorialTopic: 'api::editorial-topic.editorial-topic',
  page: 'api::page.page',
};

const COMMERCIAL_INTENT_SCORES = {
  best: 20,
  costBenefit: 20,
  comparison: 18,
  useCase: 15,
  buyingGuide: 10,
  guide: 10,
  informational: 5,
};

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const getStrapi = (strapiInstance) => {
  const activeStrapi = strapiInstance || global.strapi;

  if (!activeStrapi?.db?.query) {
    throw new Error('A Strapi instance is required to score editorial topics');
  }

  return activeStrapi;
};

const getMetadata = (entity) => {
  return entity?.metadata && typeof entity.metadata === 'object' && !Array.isArray(entity.metadata)
    ? entity.metadata
    : {};
};

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

const getEditorialKeyBase = (editorialKey) => {
  return typeof editorialKey === 'string' ? editorialKey.split(':').filter(Boolean)[0] || null : null;
};

const getIntentModifier = (topic) => {
  const metadata = getMetadata(topic);

  return metadata.intentModifier || metadata.modifier || metadata.useCase || null;
};

const describeTopic = (topic) => {
  const intent = normalizeIntent(topic?.intent);
  const intentModifier = getIntentModifier(topic);
  const editorialKey = buildEditorialKey({
    term: topic?.keyword || topic?.sourceTerm,
    normalizedTerm: topic?.normalizedKeyword,
    intent,
    intentModifier,
  });
  const clusterKey = buildEditorialTermKey({
    term: topic?.sourceTerm || topic?.keyword,
    intent: 'best',
  }) || getEditorialKeyBase(editorialKey);

  return {
    id: topic?.id,
    normalizedKeyword: normalizeKeyText(topic?.normalizedKeyword || topic?.keyword),
    editorialKey,
    clusterKey,
    intent,
    intentModifier,
    keyword: topic?.keyword || topic?.normalizedKeyword || null,
  };
};

const describePage = (page) => {
  const intent = normalizeIntent(page?.editorialIntent || page?.ranking?.editorialIntent);
  const editorialKey = page?.editorialKey || page?.ranking?.editorialKey || buildEditorialKey({
    term: [page?.slug, page?.title].filter(Boolean).join(' '),
    intent,
  });

  return {
    id: page?.id,
    normalizedKeyword: normalizeKeyText([page?.slug, page?.title].filter(Boolean).join(' ')),
    editorialKey,
    clusterKey: getEditorialKeyBase(editorialKey) || buildEditorialTermKey({
      term: [page?.slug, page?.title].filter(Boolean).join(' '),
      intent,
    }),
    intent,
    title: page?.title || page?.slug || null,
  };
};

const tokenSimilarity = (left, right) => {
  const leftTokens = new Set(normalizeKeyText(left).split(' ').filter(Boolean));
  const rightTokens = new Set(normalizeKeyText(right).split(' ').filter(Boolean));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  const intersectionSize = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const unionSize = new Set([...leftTokens, ...rightTokens]).size;

  return unionSize ? intersectionSize / unionSize : 0;
};

const getDemandScore = (topic) => {
  const trendScore = Number(getMetadata(topic).trendScore);

  if (!Number.isFinite(trendScore)) {
    return {
      value: 10,
      reason: 'Sem sinal do Google Trends; aplicado baseline deterministico de demanda',
    };
  }

  const normalizedTrendScore = clamp(trendScore, 0, 100);

  return {
    value: Math.round((normalizedTrendScore / 100) * 40),
    reason: `Google Trends score ${normalizedTrendScore}`,
  };
};

const getClusterGapScore = (topicDescriptor, publishedPages) => {
  const clusterPages = publishedPages.filter((page) => page.clusterKey === topicDescriptor.clusterKey);

  if (!clusterPages.length) {
    return {
      value: 25,
      reason: `Nenhuma pagina publicada no cluster ${topicDescriptor.clusterKey || 'desconhecido'}`,
    };
  }

  const sameIntentPages = clusterPages.filter((page) => page.intent === topicDescriptor.intent);

  if (!sameIntentPages.length) {
    return {
      value: 25,
      reason: `Nenhuma pagina publicada para ${topicDescriptor.intent} no cluster ${topicDescriptor.clusterKey}`,
    };
  }

  const alreadyCovered = sameIntentPages.find((page) => {
    return page.editorialKey === topicDescriptor.editorialKey ||
      tokenSimilarity(page.normalizedKeyword, topicDescriptor.normalizedKeyword) >= 0.65;
  });

  if (alreadyCovered) {
    return {
      value: 0,
      reason: `Intent ja coberto por pagina publicada: ${alreadyCovered.title || alreadyCovered.editorialKey}`,
    };
  }

  return {
    value: 12,
    reason: `Cluster possui pagina ${topicDescriptor.intent}, mas sem cobertura editorial equivalente`,
  };
};

const getCommercialIntentScore = (topic) => {
  const intent = normalizeIntent(topic?.intent);

  const value = COMMERCIAL_INTENT_SCORES[intent] ?? COMMERCIAL_INTENT_SCORES.informational;
  const level = value >= 18 ? 'alta' : value >= 10 ? 'media' : 'baixa';

  return {
    value,
    reason: `${intent} possui intencao comercial ${level}`,
  };
};

const getCompetitionPenalty = (topicDescriptor, competitors) => {
  let penalty = 0;
  let closestCompetitor = null;

  for (const competitor of competitors) {
    if (competitor.id === topicDescriptor.id && competitor.entityType === 'topic') {
      continue;
    }

    if (competitor.clusterKey !== topicDescriptor.clusterKey) {
      continue;
    }

    if (
      topicDescriptor.editorialKey &&
      competitor.editorialKey &&
      competitor.editorialKey === topicDescriptor.editorialKey
    ) {
      return {
        value: -20,
        reason: `${competitor.entityType === 'page' ? 'Pagina publicada' : 'Topic aprovado'} com editorialKey equivalente: ${competitor.title || competitor.keyword || competitor.editorialKey}`,
      };
    }

    if (
      topicDescriptor.normalizedKeyword &&
      competitor.normalizedKeyword === topicDescriptor.normalizedKeyword
    ) {
      return {
        value: -20,
        reason: `${competitor.entityType === 'page' ? 'Pagina publicada' : 'Topic aprovado'} com keyword equivalente: ${competitor.title || competitor.keyword || competitor.normalizedKeyword}`,
      };
    }

    const similarity = tokenSimilarity(competitor.normalizedKeyword, topicDescriptor.normalizedKeyword);

    if (similarity >= 0.8) {
      if (penalty > -15) {
        penalty = -15;
        closestCompetitor = competitor;
      }
    } else if (similarity >= 0.65) {
      if (penalty > -10) {
        penalty = -10;
        closestCompetitor = competitor;
      }
    } else if (similarity >= 0.5) {
      if (penalty > -5) {
        penalty = -5;
        closestCompetitor = competitor;
      }
    }
  }

  return {
    value: penalty,
    reason: closestCompetitor
      ? `Conteudo semelhante existe: ${closestCompetitor.title || closestCompetitor.keyword || closestCompetitor.editorialKey}`
      : 'Nenhuma pagina publicada ou topic aprovado com similaridade relevante',
  };
};

const parseDate = (value) => {
  const date = value ? new Date(value) : null;

  return date && Number.isFinite(date.getTime()) ? date : null;
};

const getFreshnessScore = (topic, now) => {
  const metadata = getMetadata(topic);
  const candidateDates = [
    topic?.approvedAt,
    topic?.createdAt,
    topic?.generatedAt,
    metadata.discoveredAt,
    metadata.generatedAt,
  ].map(parseDate).filter(Boolean);

  if (!candidateDates.length) {
    return {
      value: 0,
      reason: 'Topic sem data de descoberta valida',
    };
  }

  const mostRecentDate = new Date(Math.max(...candidateDates.map((date) => date.getTime())));
  const ageInDays = Math.max(0, (now.getTime() - mostRecentDate.getTime()) / (24 * 60 * 60 * 1000));

  let value = 0;

  if (ageInDays <= 7) {
    value = 15;
  } else if (ageInDays <= 30) {
    value = 12;
  } else if (ageInDays <= 90) {
    value = 8;
  } else if (ageInDays <= 180) {
    value = 4;
  }

  return {
    value,
    reason: value
      ? `Topic descoberto ha aproximadamente ${Math.floor(ageInDays)} dia(s)`
      : 'Topic descoberto ha mais de 180 dias',
  };
};

const createScoringContext = async (strapiInstance) => {
  const app = getStrapi(strapiInstance);
  const [pages, approvedTopics] = await Promise.all([
    query(app, uid.page).findMany({
      where: {
        status: 'published',
        pageType: 'ranking',
      },
      populate: {
        ranking: true,
      },
      limit: 10000,
    }),
    query(app, uid.editorialTopic).findMany({
      where: {
        status: 'approved',
      },
      limit: 10000,
    }),
  ]);
  const publishedPages = pages.map(describePage);
  const approvedTopicDescriptors = approvedTopics.map((topic) => ({
    ...describeTopic(topic),
    entityType: 'topic',
  }));

  return {
    publishedPages,
    competitors: [
      ...publishedPages.map((page) => ({ ...page, entityType: 'page' })),
      ...approvedTopicDescriptors,
    ],
  };
};

const scoreTopic = async (strapiInstance, topic, options = {}) => {
  const app = getStrapi(strapiInstance);

  if (!topic?.id) {
    throw new Error('A persisted EditorialTopic is required for scoring');
  }

  const context = options.context || await createScoringContext(app);
  const now = options.now instanceof Date ? options.now : new Date();
  const topicDescriptor = describeTopic(topic);
  const breakdown = {
    demand: getDemandScore(topic),
    clusterGap: getClusterGapScore(topicDescriptor, context.publishedPages),
    commercialIntent: getCommercialIntentScore(topic),
    competitionPenalty: getCompetitionPenalty(topicDescriptor, context.competitors),
    freshness: getFreshnessScore(topic, now),
  };
  const score = clamp(
    Object.values(breakdown).reduce((total, item) => total + item.value, 0),
    0,
    100
  );

  return {
    score,
    breakdown,
  };
};

module.exports = {
  createScoringContext,
  describeTopic,
  scoreTopic,
};
