'use strict';

const MIN_PUBLISHED_PAGES = 3;
const MIN_DISTINCT_INTENTS = 2;
const MIN_TOTAL_TOPICS = 5;

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const getCount = (value) => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
};

const pluralizeWord = (word) => {
  if (!word) {
    return word;
  }

  if (word === 'pneu') {
    return 'pneus';
  }

  if (word === 'air') {
    return word;
  }

  if (word.endsWith('ao')) {
    return `${word.slice(0, -2)}oes`;
  }

  if (word.endsWith('r') || word.endsWith('z')) {
    return `${word}es`;
  }

  if (word.endsWith('l')) {
    return `${word.slice(0, -1)}is`;
  }

  if (!word.endsWith('s')) {
    return `${word}s`;
  }

  return word;
};

const buildHubTerm = (clusterKey = '') => {
  const words = normalizeText(clusterKey).split(' ').filter(Boolean);

  if (!words.length) {
    return 'guias';
  }

  if (clusterKey === 'air fryer') {
    return 'air fryers';
  }

  return [pluralizeWord(words[0]), ...words.slice(1)].join(' ');
};

const titleCase = (value = '') => normalizeText(value)
  .split(' ')
  .filter(Boolean)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

const slugify = (value = '') => normalizeText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9\s-]+/g, ' ')
  .replace(/[-_]+/g, ' ')
  .replace(/\s+/g, '-')
  .replace(/^-+|-+$/g, '');

const getDistinctIntents = (cluster = {}) => {
  const intents = new Set();

  for (const page of Array.isArray(cluster.pages) ? cluster.pages : []) {
    if (page?.editorialIntent) {
      intents.add(page.editorialIntent);
    }
  }

  for (const topic of Array.isArray(cluster.topics) ? cluster.topics : []) {
    if (topic?.intent) {
      intents.add(topic.intent);
    }
  }

  return intents.size;
};

const getPrimaryCategorySlug = (cluster = {}) => {
  const pages = Array.isArray(cluster.pages) ? cluster.pages : [];
  const categoryCounts = new Map();

  for (const page of pages) {
    const categorySlug = normalizeText(page?.categorySlug);

    if (categorySlug) {
      categoryCounts.set(categorySlug, (categoryCounts.get(categorySlug) || 0) + 1);
    }
  }

  const [categorySlug] = Array.from(categoryCounts.entries())
    .sort((first, second) => {
      if (second[1] !== first[1]) {
        return second[1] - first[1];
      }

      return first[0].localeCompare(second[0], 'pt-BR');
    })[0] || [];

  return categorySlug || null;
};

const pluralizeLabel = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`;

const buildReasons = ({ publishedPages, distinctIntents, totalTopics }) => [
  pluralizeLabel(publishedPages, 'pagina publicada', 'paginas publicadas'),
  pluralizeLabel(distinctIntents, 'intencao editorial', 'intencoes editoriais'),
  pluralizeLabel(totalTopics, 'topic', 'topics'),
];

const buildMissingReasons = ({ publishedPages, distinctIntents, totalTopics }) => {
  const missing = [];

  if (publishedPages < MIN_PUBLISHED_PAGES) {
    missing.push(pluralizeLabel(MIN_PUBLISHED_PAGES - publishedPages, 'pagina publicada', 'paginas publicadas'));
  }

  if (distinctIntents < MIN_DISTINCT_INTENTS) {
    missing.push(pluralizeLabel(MIN_DISTINCT_INTENTS - distinctIntents, 'intencao editorial', 'intencoes editoriais'));
  }

  if (totalTopics < MIN_TOTAL_TOPICS) {
    missing.push(pluralizeLabel(MIN_TOTAL_TOPICS - totalTopics, 'topic', 'topics'));
  }

  return missing;
};

const calculateScore = ({ publishedPages, distinctIntents, totalTopics }) => {
  const publishedPagesScore = Math.min(publishedPages / MIN_PUBLISHED_PAGES, 1) * 50;
  const intentsScore = Math.min(distinctIntents / MIN_DISTINCT_INTENTS, 1) * 30;
  const topicsScore = Math.min(totalTopics / MIN_TOTAL_TOPICS, 1) * 20;

  return Math.round(Math.min(publishedPagesScore + intentsScore + topicsScore, 100));
};

const evaluateClusterEligibility = async (cluster = {}) => {
  const topicsByStatus = cluster.topicsByStatus || {};
  const publishedPages = Array.isArray(cluster.pages) ? cluster.pages.length : 0;
  const approvedTopics = getCount(topicsByStatus.approved);
  const pendingTopics = getCount(topicsByStatus.pending);
  const totalTopics = getCount(cluster.totalTopics);
  const distinctIntents = getDistinctIntents(cluster);
  const metrics = {
    publishedPages,
    approvedTopics,
    pendingTopics,
    totalTopics,
    distinctIntents,
  };
  const eligible = publishedPages >= MIN_PUBLISHED_PAGES &&
    distinctIntents >= MIN_DISTINCT_INTENTS &&
    totalTopics >= MIN_TOTAL_TOPICS;
  const hubTerm = buildHubTerm(cluster.clusterKey);
  const categorySlug = getPrimaryCategorySlug(cluster);

  return {
    eligible,
    score: calculateScore(metrics),
    reasons: buildReasons(metrics),
    missingReasons: buildMissingReasons(metrics),
    metrics,
    suggestedHub: {
      title: `Guia de ${titleCase(hubTerm)}`,
      slug: `guias/${slugify(hubTerm)}`,
      categorySlug,
      clusterKey: cluster.clusterKey || null,
    },
  };
};

module.exports = {
  evaluateClusterEligibility,
};
