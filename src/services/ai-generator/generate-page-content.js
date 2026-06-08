'use strict';

const { createStructuredResponse } = require('./openai-client');

const generatedPageSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'excerpt',
    'introduction',
    'summary',
    'topPicks',
    'comparison',
    'methodology',
    'conclusion',
    'seo',
    'faqs',
  ],
  properties: {
    title: {
      type: 'string',
    },
    excerpt: {
      type: 'string',
    },
    introduction: {
      type: 'string',
    },
    summary: {
      type: 'string',
    },
    topPicks: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'productName', 'reason'],
        properties: {
          label: {
            type: 'string',
          },
          productName: {
            type: 'string',
          },
          reason: {
            type: 'string',
          },
        },
      },
    },
    comparison: {
      type: 'string',
    },
    methodology: {
      type: 'string',
    },
    conclusion: {
      type: 'string',
    },
    seo: {
      type: 'object',
      additionalProperties: false,
      required: ['metaTitle', 'metaDescription', 'focusKeyword', 'secondaryKeywords'],
      properties: {
        metaTitle: {
          type: 'string',
        },
        metaDescription: {
          type: 'string',
        },
        focusKeyword: {
          type: 'string',
        },
        secondaryKeywords: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
    faqs: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'answer'],
        properties: {
          question: {
            type: 'string',
          },
          answer: {
            type: 'string',
          },
        },
      },
    },
  },
};

const TOP_PICK_LABELS = ['Melhor geral', 'Melhor custo-beneficio', 'Melhor alternativa'];
const GENERIC_INTRO_PATTERNS = [
  /escolher\s+.+pode\s+ser\s+uma\s+tarefa\s+dificil/i,
  /neste\s+artigo/i,
  /se\s+voce\s+esta\s+em\s+busca/i,
];
const SEO_TITLE_MIN_LENGTH = 50;
const SEO_TITLE_MAX_LENGTH = 60;
const SEO_DESCRIPTION_MIN_LENGTH = 140;
const SEO_DESCRIPTION_MAX_LENGTH = 160;
const YEAR_PATTERN = /\b20\d{2}\b/g;
const DATE_PATTERN = /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g;
const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'marco',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const MONTH_PATTERN = new RegExp(`\\b(?:${MONTH_NAMES.join('|')})\\b`, 'gi');
const RELATIVE_TEMPORAL_PATTERNS = [
  /\b(?:este|neste)\s+ano\b/gi,
  /\btemporada\s+atual\b/gi,
  /\b(?:ranking|guia|comparativo|melhor|melhores)\s+(?:do|da|de|para|em)\s+ano\b/gi,
];

const stripHtml = (value = '') => {
  return value.toString().replace(/<[^>]*>/g, ' ');
};

const normalizeWhitespace = (value = '') => {
  return stripHtml(value).replace(/\s+/g, ' ').trim();
};

const normalizeLongText = (value = '') => {
  return stripHtml(value)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const normalizeComparableText = (value = '') => {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const trimAtWord = (value = '', maxLength) => {
  const text = normalizeWhitespace(value);

  if (!maxLength || text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength + 1);
  const lastSpace = truncated.lastIndexOf(' ');

  return truncated
    .slice(0, lastSpace > 20 ? lastSpace : maxLength)
    .trim()
    .replace(/[.,;:!?-]+$/g, '');
};

const getItemName = (item) => {
  return item?.product?.name || item?.title || null;
};

const getPrimaryProductName = (rankingContext) => {
  return getItemName(rankingContext.products?.[0]) || null;
};

const getAllowedTemporalContext = (rankingContext) => {
  const contextText = JSON.stringify(rankingContext);
  const normalizedContextText = normalizeComparableText(contextText);

  return {
    years: new Set(contextText.match(YEAR_PATTERN) || []),
    months: new Set(
      MONTH_NAMES.filter((month) =>
        normalizedContextText.includes(normalizeComparableText(month))
      ).map((month) => normalizeComparableText(month))
    ),
    dates: new Set(contextText.match(DATE_PATTERN) || []),
  };
};

const cleanTemporalWhitespace = (value = '') => {
  return value
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .replace(/\s+([)\]}])/g, '$1')
    .replace(/\s+-\s*(?=($|[,.;:!?]))/g, '')
    .replace(/(^|[\s([{])-\s+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\/\s+/g, ' / ')
    .replace(/\s+$/g, '')
    .trim();
};

const removeUnauthorizedYears = (value, allowedYears) => {
  return value.replace(
    /\b(?:em|de|do|da|para|no|na)?\s*(20\d{2})\b/gi,
    (match, year) => {
      if (allowedYears.has(year)) {
        return match;
      }

      return '';
    }
  );
};

const removeUnauthorizedDates = (value, allowedDates) => {
  return value.replace(DATE_PATTERN, (date) => (allowedDates.has(date) ? date : ''));
};

const removeUnauthorizedMonths = (value, allowedMonths) => {
  return value.replace(
    new RegExp(
      `\\b(?:atualizado(?:a)?\\s+em|em|de|do|da|para|no|na)?\\s*(${MONTH_NAMES.join('|')})(?:\\s+de\\s+20\\d{2})?\\b`,
      'gi'
    ),
    (match, month) => {
      if (allowedMonths.has(normalizeComparableText(month))) {
        return match;
      }

      return '';
    }
  );
};

const removeRelativeTemporalPhrases = (value) => {
  return RELATIVE_TEMPORAL_PATTERNS.reduce(
    (currentValue, pattern) => currentValue.replace(pattern, 'nesta selecao'),
    value
  );
};

const sanitizeTemporalText = (value, temporalContext) => {
  if (typeof value !== 'string') {
    return value;
  }

  const sanitizedValue = [
    removeRelativeTemporalPhrases,
    (text) => removeUnauthorizedDates(text, temporalContext.dates),
    (text) => removeUnauthorizedMonths(text, temporalContext.months),
    (text) => removeUnauthorizedYears(text, temporalContext.years),
    cleanTemporalWhitespace,
  ].reduce((currentValue, sanitizer) => sanitizer(currentValue), value);

  return sanitizedValue;
};

const sanitizeTemporalValue = (value, temporalContext) => {
  if (typeof value === 'string') {
    return sanitizeTemporalText(value, temporalContext);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeTemporalValue(item, temporalContext))
      .filter((item) => {
        if (typeof item === 'string') {
          return Boolean(normalizeWhitespace(item));
        }

        return item !== null && item !== undefined;
      });
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sanitizeTemporalValue(item, temporalContext),
      ])
    );
  }

  return value;
};

const findUnauthorizedTemporalReferences = (value, temporalContext, path = 'content') => {
  if (typeof value === 'string') {
    const findings = [];
    const years = value.match(YEAR_PATTERN) || [];
    const dates = value.match(DATE_PATTERN) || [];
    const months = value.match(MONTH_PATTERN) || [];

    for (const year of years) {
      if (!temporalContext.years.has(year)) {
        findings.push(`${path}: ${year}`);
      }
    }

    for (const date of dates) {
      if (!temporalContext.dates.has(date)) {
        findings.push(`${path}: ${date}`);
      }
    }

    for (const month of months) {
      if (!temporalContext.months.has(normalizeComparableText(month))) {
        findings.push(`${path}: ${month}`);
      }
    }

    for (const pattern of RELATIVE_TEMPORAL_PATTERNS) {
      pattern.lastIndex = 0;

      if (pattern.test(value)) {
        findings.push(`${path}: relative temporal phrase`);
      }
    }

    return findings;
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findUnauthorizedTemporalReferences(item, temporalContext, `${path}[${index}]`)
    );
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) =>
      findUnauthorizedTemporalReferences(item, temporalContext, `${path}.${key}`)
    );
  }

  return [];
};

const applyTemporalGuardrails = (content, rankingContext) => {
  const temporalContext = getAllowedTemporalContext(rankingContext);
  const sanitizedContent = sanitizeTemporalValue(content, temporalContext);
  const findings = findUnauthorizedTemporalReferences(sanitizedContent, temporalContext);

  if (findings.length > 0) {
    throw new Error(`AI response includes unauthorized temporal references: ${findings.join(', ')}`);
  }

  return sanitizedContent;
};

const hasGenericIntro = (value = '') => {
  return GENERIC_INTRO_PATTERNS.some((pattern) => pattern.test(value));
};

const buildFallbackIntroduction = (rankingContext) => {
  const rankingTitle = normalizeWhitespace(rankingContext.ranking?.title) || 'este ranking';
  const categoryName = normalizeWhitespace(rankingContext.category?.name);
  const buyerContext = categoryName
    ? `para compras na categoria ${categoryName}`
    : 'para apoiar a decisao de compra';

  return `${rankingTitle} organiza os produtos pela ordem editorial do ranking ${buyerContext}. A proposta e mostrar rapidamente quais opcoes tendem a fazer mais sentido para diferentes perfis de comprador, usando apenas os dados disponiveis dos produtos, do marketplace e dos criterios definidos pelo editor.`;
};

const buildFallbackTopPicks = (rankingContext) => {
  return (rankingContext.products || []).slice(0, 3).map((item, index) => {
    const productName = getItemName(item) || `Produto na posicao ${item.position || index + 1}`;
    const label = TOP_PICK_LABELS[index] || `Destaque ${index + 1}`;
    const reason =
      index === 0
        ? 'Aparece no topo do ranking e deve ser tratado como a recomendacao principal.'
        : 'Entra como alternativa relevante dentro da ordem editorial do ranking.';

    return {
      label,
      productName,
      reason,
    };
  });
};

const normalizeTopPicks = (topPicks, rankingContext) => {
  const validProductNames = new Set(
    (rankingContext.products || [])
      .slice(0, 3)
      .map(getItemName)
      .filter(Boolean)
  );
  const normalized = Array.isArray(topPicks)
    ? topPicks
        .map((pick, index) => {
          const productName = normalizeWhitespace(pick?.productName);

          if (!productName || !validProductNames.has(productName)) {
            return null;
          }

          return {
            label: normalizeWhitespace(pick.label) || TOP_PICK_LABELS[index] || `Destaque ${index + 1}`,
            productName,
            reason: normalizeWhitespace(pick.reason),
          };
        })
        .filter((pick) => pick?.reason)
    : [];

  return normalized.length ? normalized : buildFallbackTopPicks(rankingContext);
};

const buildTopPicksSection = (topPicks) => {
  if (!topPicks.length) {
    return null;
  }

  return [
    'Top picks do ranking',
    ...topPicks.map((pick) => `${pick.label}: ${pick.productName}. ${pick.reason}`),
  ].join('\n');
};

const buildEditorialIntro = (content, topPicks, rankingContext) => {
  const introduction = normalizeLongText(content.introduction);
  const effectiveIntroduction = hasGenericIntro(introduction)
    ? buildFallbackIntroduction(rankingContext)
    : introduction;
  const sections = [
    effectiveIntroduction,
    buildTopPicksSection(topPicks),
    content.comparison ? `Comparativo rapido\n${normalizeLongText(content.comparison)}` : null,
    content.methodology ? `Como avaliamos\n${normalizeLongText(content.methodology)}` : null,
  ].filter(Boolean);

  return sections.join('\n\n');
};

const buildFallbackFocusKeyword = (rankingContext) => {
  const rankingTitle = normalizeWhitespace(rankingContext.ranking?.title);
  const categoryName = normalizeWhitespace(rankingContext.category?.name);
  const productName = normalizeWhitespace(getPrimaryProductName(rankingContext));

  return [rankingTitle, categoryName, productName].filter(Boolean).join(' ');
};

const normalizeMetaTitle = (value, rankingContext) => {
  const rankingTitle = normalizeWhitespace(rankingContext.ranking?.title);
  const categoryName = normalizeWhitespace(rankingContext.category?.name);
  let title = normalizeWhitespace(value) || rankingTitle;

  if (title.length < SEO_TITLE_MIN_LENGTH && categoryName && !title.includes(categoryName)) {
    title = `${title}: guia de ${categoryName}`;
  }

  if (title.length < SEO_TITLE_MIN_LENGTH) {
    title = `${title} para comparar e comprar melhor`;
  }

  return trimAtWord(title, SEO_TITLE_MAX_LENGTH);
};

const normalizeMetaDescription = (value, content) => {
  const excerpt = normalizeWhitespace(content.excerpt);
  let description = normalizeWhitespace(value) || excerpt;

  if (description.length < SEO_DESCRIPTION_MIN_LENGTH) {
    description = `${description} Compare opcoes do ranking, veja pontos fortes, limitacoes e escolha com mais seguranca.`;
  }

  return trimAtWord(description, SEO_DESCRIPTION_MAX_LENGTH);
};

const normalizeKeywords = (keywords, rankingContext) => {
  const temporalContext = getAllowedTemporalContext(rankingContext);
  const candidates = [
    ...(Array.isArray(keywords) ? keywords : []),
    rankingContext.ranking?.title,
    rankingContext.category?.name,
    rankingContext.subCategory?.name,
    getPrimaryProductName(rankingContext),
  ];
  const normalized = [];

  for (const keyword of candidates) {
    const value = normalizeWhitespace(keyword).toLowerCase();
    const guardedValue = sanitizeTemporalText(value, temporalContext);

    if (guardedValue && !normalized.includes(guardedValue)) {
      normalized.push(guardedValue);
    }
  }

  return normalized.slice(0, 8);
};

const normalizeFaqs = (faqs) => {
  const seenQuestions = new Set();

  return faqs
    .map((faq) => ({
      question: normalizeWhitespace(faq.question),
      answer: normalizeLongText(faq.answer),
    }))
    .filter((faq) => {
      const key = faq.question.toLowerCase();

      if (!faq.question || !faq.answer || seenQuestions.has(key)) {
        return false;
      }

      seenQuestions.add(key);

      return true;
    })
    .slice(0, 6);
};

const normalizeGeneratedContent = (content, rankingContext) => {
  const topPicks = normalizeTopPicks(content.topPicks, rankingContext);
  const introduction = buildEditorialIntro(content, topPicks, rankingContext);
  const seo = {
    metaTitle: normalizeMetaTitle(content.seo.metaTitle, rankingContext),
    metaDescription: normalizeMetaDescription(content.seo.metaDescription, content),
    focusKeyword:
      normalizeWhitespace(content.seo.focusKeyword) || buildFallbackFocusKeyword(rankingContext),
    secondaryKeywords: normalizeKeywords(content.seo.secondaryKeywords, rankingContext),
  };

  const normalizedContent = {
    ...content,
    title: normalizeWhitespace(content.title),
    excerpt: trimAtWord(content.excerpt, 220),
    introduction,
    summary: normalizeLongText(content.summary),
    topPicks,
    comparison: normalizeLongText(content.comparison),
    methodology: normalizeLongText(content.methodology),
    conclusion: normalizeLongText(content.conclusion),
    seo,
    faqs: normalizeFaqs(content.faqs),
  };

  return applyTemporalGuardrails(normalizedContent, rankingContext);
};

const buildSystemPrompt = () => {
  return [
    'Voce e um editor especialista em recomendacao de produtos do Manual dos Achados.',
    'Gere somente conteudo em portugues do Brasil para uma pagina publica de ranking focada em decisao de compra.',
    'Escreva com criterio editorial, comparacao objetiva e linguagem natural para consumidor brasileiro.',
    'Nao use HTML. Nao use Markdown. Nao invente precos, potencia, especificacoes, estoque ou dados tecnicos ausentes.',
    'Nunca invente anos, datas, meses, temporadas ou periodos.',
    'Nunca utilize 2023, 2024, 2025, 2026 ou qualquer outro ano a menos que esse ano esteja presente no contexto enviado.',
    'Nao use expressoes como "atualizado em janeiro", "melhor de 2026", "ranking 2025", "este ano", "neste ano" ou "temporada atual" sem contexto temporal explicito.',
    'Quando um dado nao existir no contexto, simplesmente nao mencione esse dado.',
    'Evite frases genericas como "Escolher uma boa opcao pode ser uma tarefa dificil", "Neste artigo" e variacoes.',
    'Nao repita a mesma ideia em campos diferentes.',
    'A resposta deve seguir exatamente o JSON Schema informado.',
  ].join(' ');
};

const buildUserPrompt = (rankingContext) => {
  const productCount = rankingContext.products?.length || 0;

  return [
    'Gere uma versao V2 do rascunho editorial para Page draft, Seo draft e Faq draft com base no contexto abaixo.',
    'O conteudo sera revisado por um editor antes da publicacao.',
    'Objetivo editorial: ajudar o leitor a decidir qual produto faz mais sentido para seu perfil de compra.',
    `Use somente os ${productCount} produtos informados e mantenha a ordem do ranking como sinal editorial principal.`,
    'Introducao: explique o problema de compra, o perfil do comprador e o objetivo do ranking sem abertura generica.',
    'Top picks: use os tres primeiros itens quando existirem. Rotule como Melhor geral, Melhor custo-beneficio e Melhor alternativa. Nao invente produtos.',
    'Comparacao: compare os primeiros produtos entre si, dizendo para qual perfil cada um tende a fazer mais sentido com base apenas nos dados disponiveis.',
    'Metodologia: gere uma secao "Como avaliamos" citando posicao, informacoes do marketplace, disponibilidade, preco quando existir, avaliacao quando existir e criterios editoriais.',
    'Se source.sourceLabel indicar mais vendidos do Mercado Livre, mencione essa origem como sinal de ordem do ranking, sem afirmar que os produtos sao os melhores absolutos ou mais recentes.',
    'Nao mencione lastSyncAt como data publica, atualizacao, validade ou promessa de atualidade.',
    'FAQ: gere perguntas de intencao de compra, evitando perguntas vagas. Priorize uso profissional, custo-beneficio, escolha ideal e cuidados de compra.',
    'Conclusao: termine com recomendacao clara para a maioria dos usuarios, para uso profissional e para quem busca economia, quando os dados permitirem.',
    'SEO: metaTitle entre 50 e 60 caracteres; metaDescription entre 140 e 160 caracteres; focusKeyword baseada em categoria, ranking e produto principal; secondaryKeywords uteis.',
    'SEO temporal: nao inclua anos, meses, datas ou periodos em title, excerpt, introduction, conclusion, metaTitle, metaDescription, focusKeyword, secondaryKeywords ou FAQ se eles nao estiverem no contexto JSON.',
    'Slug e titulo publico serao derivados do conteudo gerado, portanto nao use anos ou periodos temporais sem contexto.',
    'Respeite os campos searchIntent, editorialNotes e evaluationCriteria quando eles existirem.',
    JSON.stringify(rankingContext),
  ].join('\n\n');
};

const validateGeneratedContent = (content) => {
  if (!content || typeof content !== 'object') {
    throw new Error('AI response must be an object');
  }

  if (!content.title || !content.excerpt || !content.introduction || !content.conclusion) {
    throw new Error('AI response is missing required page fields');
  }

  if (!content.seo?.metaTitle || !content.seo?.metaDescription) {
    throw new Error('AI response is missing required SEO fields');
  }

  if (!Array.isArray(content.topPicks) || content.topPicks.length === 0) {
    throw new Error('AI response must include top picks');
  }

  if (!content.comparison || !content.methodology) {
    throw new Error('AI response is missing comparison or methodology');
  }

  if (!Array.isArray(content.faqs) || content.faqs.length === 0) {
    throw new Error('AI response must include FAQs');
  }

  return content;
};

const generatePageContent = async (rankingContext) => {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(rankingContext);
  const response = await createStructuredResponse({
    schema: generatedPageSchema,
    systemPrompt,
    userPrompt,
  });

  const validatedContent = validateGeneratedContent(response.data);
  const normalizedContent = normalizeGeneratedContent(validatedContent, rankingContext);

  return {
    ...response,
    prompt: {
      system: systemPrompt,
      user: userPrompt,
    },
    data: normalizedContent,
  };
};

module.exports = {
  generatePageContent,
};
