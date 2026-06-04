'use strict';

const { createStructuredResponse } = require('./openai-client');

const generatedPageSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'excerpt', 'introduction', 'summary', 'conclusion', 'seo', 'faqs'],
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

const buildSystemPrompt = () => {
  return [
    'Voce e um assistente editorial do Manual dos Achados.',
    'Gere somente conteudo em portugues do Brasil para uma pagina publica de ranking.',
    'Nao use HTML. Nao use Markdown. Nao invente dados tecnicos que nao estejam no contexto.',
    'Use texto claro, direto e revisavel por editor humano.',
    'A resposta deve seguir exatamente o JSON Schema informado.',
  ].join(' ');
};

const buildUserPrompt = (rankingContext) => {
  return [
    'Gere um rascunho editorial para Page draft, Seo draft e Faq draft com base no contexto abaixo.',
    'O conteudo nao sera publicado automaticamente; ele sera revisado por um editor.',
    'Priorize a intencao de busca, os criterios editoriais e os produtos na ordem do ranking.',
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

  return {
    ...response,
    prompt: {
      system: systemPrompt,
      user: userPrompt,
    },
    data: validateGeneratedContent(response.data),
  };
};

module.exports = {
  generatePageContent,
};
