'use strict';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-4.1-mini';

const getModel = () => process.env.OPENAI_MODEL || DEFAULT_MODEL;

const getOutputText = (response) => {
  if (typeof response.output_text === 'string') {
    return response.output_text;
  }

  const textParts = [];

  for (const output of response.output || []) {
    for (const content of output.content || []) {
      if (typeof content.text === 'string') {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join('').trim();
};

const createStructuredResponse = async ({ schema, systemPrompt, userPrompt }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = getModel();

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: systemPrompt,
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: userPrompt,
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'ranking_page_content',
          strict: true,
          schema,
        },
      },
      max_output_tokens: 2500,
    }),
  });
  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = responseData.error?.message || 'OpenAI response generation failed';
    const error = new Error(message);
    error.status = response.status;
    error.responseData = responseData;

    throw error;
  }

  const outputText = getOutputText(responseData);

  if (!outputText) {
    throw new Error('OpenAI response did not include output text');
  }

  return {
    model,
    data: JSON.parse(outputText),
    responseId: responseData.id || null,
    usage: responseData.usage || null,
  };
};

module.exports = {
  createStructuredResponse,
  getModel,
};
