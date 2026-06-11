import React, { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Flex,
  Main,
  TextInput,
  Toggle,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

const RANKING_CHAT_ENDPOINT = '/api/internal/marketplaces/mercado-livre/ranking-chat';
const RANKING_CHAT_PREVIEW_ENDPOINT = '/api/internal/marketplaces/mercado-livre/ranking-chat-preview';
const EXAMPLE_TERMS = ['furadeira', 'notebook', 'mamadeira', 'air fryer'];

const formatPercent = (value) => {
  const numberValue = Number(value || 0);

  return `${Math.round(numberValue * 100)}%`;
};

const formatList = (items = []) => {
  return items.map((item) => item.message || item.code || item.key || String(item)).join(', ');
};

const getResultVariant = (result) => {
  if (result?.published) {
    return 'success';
  }

  if (result?.requiresReview) {
    return 'warning';
  }

  return 'secondary';
};

const buildAssistantMessage = (result) => {
  if (result?.published) {
    return `Publicado: ${result.publicUrl || 'URL publica indisponivel'}`;
  }

  if (result?.requiresReview) {
    return `Revisao necessaria para Page ${result.pageId || 'sem pageId'}.`;
  }

  return result?.operatorSummary || 'Fluxo concluido.';
};

const ResultSummary = ({ result }) => {
  if (!result) {
    return null;
  }

  const validationErrors = result.validationErrors || result.publication?.validationErrors || [];
  const warnings = result.warnings || [];

  return (
    <Box background="neutral0" borderColor="neutral150" hasRadius padding={5}>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography variant="beta">{result.term}</Typography>
            <Typography textColor="neutral600">{result.operatorSummary}</Typography>
          </Flex>
          <Badge active={Boolean(result.published)}>{result.operatorStatus}</Badge>
        </Flex>

        <Flex gap={4} wrap="wrap">
          <Box minWidth="180px">
            <Typography variant="sigma" textColor="neutral600">
              Categoria ML
            </Typography>
            <Typography>
              {result.pipeline?.category?.marketplaceCategoryId ||
                result.sync?.category?.marketplaceCategoryId ||
                'n/a'}
            </Typography>
          </Box>
          <Box minWidth="180px">
            <Typography variant="sigma" textColor="neutral600">
              Publicaveis
            </Typography>
            <Typography>
              {result.pipeline?.marketplaceRanking?.totalPublishable ||
                result.sync?.marketplaceRanking?.totalPublishable ||
                0}{' '}
              /{' '}
              {result.pipeline?.marketplaceRanking?.totalHighlights ||
                result.sync?.marketplaceRanking?.totalHighlights ||
                0}
            </Typography>
          </Box>
          <Box minWidth="180px">
            <Typography variant="sigma" textColor="neutral600">
              Taxa
            </Typography>
            <Typography>
              {formatPercent(
                result.pipeline?.marketplaceRanking?.publishableRate ||
                  result.sync?.marketplaceRanking?.publishableRate
              )}
            </Typography>
          </Box>
          <Box minWidth="180px">
            <Typography variant="sigma" textColor="neutral600">
              Ranking / Page
            </Typography>
            <Typography>
              {result.rankingId || 'n/a'} / {result.pageId || 'n/a'}
            </Typography>
          </Box>
          <Box minWidth="180px">
            <Typography variant="sigma" textColor="neutral600">
              Publico
            </Typography>
            <Typography>
              {result.publicEndpointStatus || 'n/a'} / sitemap {result.sitemapIncluded ? 'sim' : 'nao'}
            </Typography>
          </Box>
        </Flex>

        {result.publicUrl ? (
          <Typography textColor="success600">URL publica: {result.publicUrl}</Typography>
        ) : null}

        {validationErrors.length ? (
          <Alert closeLabel="Fechar validacoes" title="Validacoes pendentes" variant="warning">
            {formatList(validationErrors)}
          </Alert>
        ) : null}

        {warnings.length ? (
          <Typography variant="pi" textColor="neutral600">
            Avisos: {formatList(warnings)}
          </Typography>
        ) : null}
      </Flex>
    </Box>
  );
};

const getPageReuseLabel = (pageReuse) => {
  if (!pageReuse) {
    return 'n/a';
  }

  return pageReuse.found
    ? `${pageReuse.action} / Page ${pageReuse.pageId}`
    : pageReuse.action;
};

const PreviewSummary = ({ preview }) => {
  if (!preview) {
    return null;
  }

  const commandContext = preview.commandContext || {};
  const editorialPlan = preview.editorialPlan || {};
  const marketplaceCategory = preview.category?.marketplace || {};
  const localCategory = preview.category?.local?.category || {};
  const localSubCategory = preview.category?.local?.subCategory || {};

  return (
    <Box background="neutral0" borderColor="primary200" hasRadius padding={5}>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography variant="beta">Preview</Typography>
            <Typography textColor="neutral600">{commandContext.rawMessage || commandContext.term}</Typography>
          </Flex>
          <Badge active={preview.pageReuse?.found}>{getPageReuseLabel(preview.pageReuse)}</Badge>
        </Flex>

        <Flex gap={4} wrap="wrap">
          <Box minWidth="180px">
            <Typography variant="sigma" textColor="neutral600">
              Termo
            </Typography>
            <Typography>{commandContext.term || 'n/a'}</Typography>
          </Box>
          <Box minWidth="180px">
            <Typography variant="sigma" textColor="neutral600">
              Categoria ML
            </Typography>
            <Typography>
              {marketplaceCategory.id || 'n/a'} {marketplaceCategory.name ? `- ${marketplaceCategory.name}` : ''}
            </Typography>
          </Box>
          <Box minWidth="180px">
            <Typography variant="sigma" textColor="neutral600">
              Categoria local
            </Typography>
            <Typography>{localCategory.name || 'n/a'}</Typography>
          </Box>
          <Box minWidth="180px">
            <Typography variant="sigma" textColor="neutral600">
              Subcategoria local
            </Typography>
            <Typography>{localSubCategory.name || 'n/a'}</Typography>
          </Box>
          <Box minWidth="180px">
            <Typography variant="sigma" textColor="neutral600">
              Display / Fetch
            </Typography>
            <Typography>
              {commandContext.displayLimit || 0} / {commandContext.fetchLimit || 0}
            </Typography>
          </Box>
          <Box minWidth="180px">
            <Typography variant="sigma" textColor="neutral600">
              Intent
            </Typography>
            <Typography>{editorialPlan.intent || commandContext.editorialIntent || 'n/a'}</Typography>
          </Box>
        </Flex>

        <Flex gap={4} wrap="wrap">
          <Box flex="1 1 320px">
            <Typography variant="sigma" textColor="neutral600">
              Titulo sugerido
            </Typography>
            <Typography>{editorialPlan.titleHint || commandContext.titleHint || 'n/a'}</Typography>
          </Box>
          <Box flex="1 1 240px">
            <Typography variant="sigma" textColor="neutral600">
              Slug sugerido
            </Typography>
            <Typography>{editorialPlan.slugHint || commandContext.preferredSlug || 'n/a'}</Typography>
          </Box>
        </Flex>

        {preview.category?.warnings?.length ? (
          <Typography variant="pi" textColor="neutral600">
            Avisos: {formatList(preview.category.warnings)}
          </Typography>
        ) : null}
      </Flex>
    </Box>
  );
};

const MessageBubble = ({ message }) => {
  const isOperator = message.role === 'operator';

  return (
    <Flex justifyContent={isOperator ? 'flex-end' : 'flex-start'}>
      <Box
        background={isOperator ? 'primary100' : 'neutral100'}
        borderColor={isOperator ? 'primary200' : 'neutral150'}
        hasRadius
        padding={4}
        maxWidth="760px"
      >
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography fontWeight="bold">{isOperator ? 'Operador' : 'Sistema'}</Typography>
          <Typography>{message.text}</Typography>
          {message.result ? <ResultSummary result={message.result} /> : null}
        </Flex>
      </Box>
    </Flex>
  );
};

const MercadoLivrePage = () => {
  const { post } = useFetchClient();
  const [term, setTerm] = useState('');
  const [autoPublish, setAutoPublish] = useState(true);
  const [previewResult, setPreviewResult] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'system',
      text: 'Digite um termo de produto. Eu resolvo a categoria, sincronizo Mercado Livre, gero a pagina e publico se as travas passarem.',
    },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const lastResult = useMemo(() => {
    return [...messages].reverse().find((message) => message.result)?.result || null;
  }, [messages]);

  const runPreview = async (value) => {
    const normalizedTerm = value.trim();

    if (!normalizedTerm) {
      setErrorMessage('Informe uma mensagem para visualizar o preview.');
      return;
    }

    setErrorMessage('');
    setIsPreviewing(true);

    try {
      const response = await post(RANKING_CHAT_PREVIEW_ENDPOINT, {
        message: normalizedTerm,
      });

      setPreviewResult(response.data);
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Nao foi possivel gerar o preview agora.';

      setErrorMessage(message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const runTerm = async (value) => {
    const normalizedTerm = value.trim();

    if (!normalizedTerm) {
      setErrorMessage('Informe um termo para gerar o ranking.');
      return;
    }

    setErrorMessage('');
    setIsRunning(true);
    setTerm('');
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `${Date.now()}-operator`,
        role: 'operator',
        text: normalizedTerm,
      },
    ]);

    try {
      const response = await post(RANKING_CHAT_ENDPOINT, {
        message: normalizedTerm,
        autoPublish,
      });
      const result = response.data;

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `${Date.now()}-system`,
          role: 'system',
          text: buildAssistantMessage(result),
          result,
        },
      ]);
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Nao foi possivel executar o fluxo agora.';

      setErrorMessage(message);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `${Date.now()}-error`,
          role: 'system',
          text: message,
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    runPreview(term);
  };

  return (
    <Main labelledBy="ranking-generator-title">
      <Box padding={8}>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <Flex direction="column" alignItems="flex-start" gap={2}>
            <Typography variant="alpha" id="ranking-generator-title">
              Gerador de Rankings
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Entrada unica do fluxo Mercado Livre, IA e publicacao controlada.
            </Typography>
          </Flex>

          {errorMessage ? (
            <Alert closeLabel="Fechar alerta de erro" title="Erro" variant="danger">
              {errorMessage}
            </Alert>
          ) : null}

          <Box background="neutral0" borderColor="neutral150" hasRadius padding={5}>
            <form onSubmit={handleSubmit}>
              <Flex direction="column" alignItems="stretch" gap={4}>
                <Flex gap={4} alignItems="flex-end" wrap="wrap">
                  <Box flex="1 1 320px">
                    <TextInput
                      label="Termo"
                      name="term"
                      value={term}
                      onChange={(event) => {
                        setTerm(event.target.value);
                        setPreviewResult(null);
                      }}
                      placeholder="quero fazer um top 10 melhores pneus"
                    />
                  </Box>
                  <Toggle
                    label="Publicar automaticamente"
                    checked={autoPublish}
                    onLabel="Sim"
                    offLabel="Nao"
                    onChange={() => setAutoPublish((value) => !value)}
                  />
                  <Button type="submit" loading={isPreviewing} disabled={isRunning}>
                    Preview
                  </Button>
                  <Button
                    type="button"
                    loading={isRunning}
                    disabled={isPreviewing}
                    onClick={() => runTerm(term || previewResult?.commandContext?.rawMessage || '')}
                  >
                    Gerar Ranking
                  </Button>
                </Flex>

                <Flex gap={2} wrap="wrap">
                  {EXAMPLE_TERMS.map((example) => (
                    <Button
                      key={example}
                      type="button"
                      variant="tertiary"
                      disabled={isRunning || isPreviewing}
                      onClick={() => {
                        setTerm(example);
                        runPreview(example);
                      }}
                    >
                      {example}
                    </Button>
                  ))}
                </Flex>
              </Flex>
            </form>
          </Box>

          <PreviewSummary preview={previewResult} />

          <Flex direction="column" alignItems="stretch" gap={4}>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </Flex>

          {lastResult?.requiresReview ? (
            <Box background="warning100" borderColor="warning200" hasRadius padding={5}>
              <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
                <Typography>
                  A Page {lastResult.pageId || 'gerada'} precisa de revisao antes da publicacao.
                </Typography>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => window.location.assign('/admin/publication-workflow')}
                >
                  Abrir revisoes
                </Button>
              </Flex>
            </Box>
          ) : null}
        </Flex>
      </Box>
    </Main>
  );
};

export default MercadoLivrePage;
