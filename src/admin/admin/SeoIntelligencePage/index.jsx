import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Flex,
  Loader,
  Main,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

const TOPICS_ENDPOINT = '/seo-intelligence/topics';
const CLUSTERS_ENDPOINT = '/seo-intelligence/clusters';
const DEFAULT_CLUSTER_LIMIT = 50;

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'processing', label: 'Processing' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
];

const INTENT_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'best', label: 'Melhores' },
  { value: 'costBenefit', label: 'Custo-beneficio' },
  { value: 'comparison', label: 'Comparativo' },
  { value: 'buyingGuide', label: 'Guia de compra' },
  { value: 'useCase', label: 'Uso especifico' },
];

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  processing: 'Processing',
  published: 'Published',
  rejected: 'Rejected',
};

const INTENT_LABELS = {
  best: 'Melhores',
  costBenefit: 'Custo-beneficio',
  comparison: 'Comparativo',
  buyingGuide: 'Guia de compra',
  useCase: 'Uso especifico',
};

const formatDate = (value) => {
  if (!value) {
    return 'n/a';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
};

const getStatusBadgeActive = (status) => {
  return status === 'approved' || status === 'published';
};

const buildTopicsUrl = ({ status, intent, q }) => {
  const searchParams = new URLSearchParams();

  if (status) {
    searchParams.set('status', status);
  }

  if (intent) {
    searchParams.set('intent', intent);
  }

  if (q) {
    searchParams.set('q', q);
  }

  const queryString = searchParams.toString();

  return queryString ? `${TOPICS_ENDPOINT}?${queryString}` : TOPICS_ENDPOINT;
};

const buildClustersUrl = ({ limit = DEFAULT_CLUSTER_LIMIT } = {}) => {
  const searchParams = new URLSearchParams();

  if (limit) {
    searchParams.set('limit', limit);
  }

  const queryString = searchParams.toString();

  return queryString ? `${CLUSTERS_ENDPOINT}?${queryString}` : CLUSTERS_ENDPOINT;
};

const getCount = (value) => Number(value) || 0;

const buildSuggestedHubUrl = (suggestedHub) => {
  if (!suggestedHub?.slug) {
    return 'n/a';
  }

  return suggestedHub.categorySlug
    ? `/${suggestedHub.categorySlug}/${suggestedHub.slug}`
    : `/${suggestedHub.slug}`;
};

const TopicActions = ({ topic, onAction, onGenerate, isUpdating, isGenerating }) => {
  const isLocked = topic.status === 'processing' || topic.status === 'published';
  const canGenerate = topic.status === 'approved';

  return (
    <Flex gap={2} wrap="wrap">
      <Button
        type="button"
        size="S"
        disabled={isUpdating || isLocked || topic.status === 'approved'}
        onClick={() => onAction(topic, 'approve')}
      >
        Aprovar
      </Button>
      <Button
        type="button"
        size="S"
        variant="danger-light"
        disabled={isUpdating || isLocked || topic.status === 'rejected'}
        onClick={() => onAction(topic, 'reject')}
      >
        Rejeitar
      </Button>
      <Button
        type="button"
        size="S"
        variant="tertiary"
        disabled={isUpdating || isLocked || topic.status === 'pending'}
        onClick={() => onAction(topic, 'pending')}
      >
        Pending
      </Button>
      {canGenerate ? (
        <Button
          type="button"
          size="S"
          variant="secondary"
          loading={isGenerating}
          disabled={isUpdating}
          onClick={() => onGenerate(topic)}
        >
          Gerar Pagina
        </Button>
      ) : null}
      {topic.status === 'processing' ? (
        <Button type="button" size="S" variant="tertiary" disabled>
          Processando
        </Button>
      ) : null}
    </Flex>
  );
};

const TopicRow = ({ topic, onAction, onGenerate, isUpdating, isGenerating }) => {
  return (
    <Box background="neutral0" borderColor="neutral150" hasRadius padding={4}>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex justifyContent="space-between" alignItems="flex-start" gap={4} wrap="wrap">
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography fontWeight="bold">{topic.keyword}</Typography>
            <Typography variant="pi" textColor="neutral600">
              {topic.normalizedKeyword}
            </Typography>
          </Flex>
          <Badge active={getStatusBadgeActive(topic.status)}>
            {STATUS_LABELS[topic.status] || topic.status}
          </Badge>
        </Flex>

        <Flex gap={5} wrap="wrap">
          <Box minWidth="120px">
            <Typography variant="sigma" textColor="neutral600">
              Intent
            </Typography>
            <Typography>{INTENT_LABELS[topic.intent] || topic.intent || 'n/a'}</Typography>
          </Box>
          <Box minWidth="130px">
            <Typography variant="sigma" textColor="neutral600">
              Template
            </Typography>
            <Typography>{topic.template || 'n/a'}</Typography>
          </Box>
          <Box minWidth="90px">
            <Typography variant="sigma" textColor="neutral600">
              Priority
            </Typography>
            <Typography>{topic.priority ?? 'n/a'}</Typography>
          </Box>
          <Box minWidth="160px">
            <Typography variant="sigma" textColor="neutral600">
              Source Term
            </Typography>
            <Typography>{topic.sourceTerm || 'n/a'}</Typography>
          </Box>
          <Box minWidth="160px">
            <Typography variant="sigma" textColor="neutral600">
              Created At
            </Typography>
            <Typography>{formatDate(topic.createdAt)}</Typography>
          </Box>
          <Box minWidth="160px">
            <Typography variant="sigma" textColor="neutral600">
              Page
            </Typography>
            <Typography>
              {topic.page?.id ? `#${topic.page.id} (${topic.page.status || 'sem status'})` : 'n/a'}
            </Typography>
          </Box>
        </Flex>

        <TopicActions
          topic={topic}
          onAction={onAction}
          onGenerate={onGenerate}
          isUpdating={isUpdating}
          isGenerating={isGenerating}
        />
      </Flex>
    </Box>
  );
};

const ClusterCard = ({ cluster }) => {
  const pendingCount = getCount(cluster.topicsByStatus?.pending);
  const approvedCount = getCount(cluster.topicsByStatus?.approved);
  const publishedTopicCount = getCount(cluster.topicsByStatus?.published);
  const hubEligibility = cluster.hubEligibility || {};
  const suggestedHub = hubEligibility.suggestedHub || {};
  const reasons = Array.isArray(hubEligibility.reasons) ? hubEligibility.reasons : [];
  const missingReasons = Array.isArray(hubEligibility.missingReasons) ? hubEligibility.missingReasons : [];
  const topPages = Array.isArray(cluster.pages) ? cluster.pages.slice(0, 4) : [];
  const topTopics = Array.isArray(cluster.topics) ? cluster.topics.slice(0, 6) : [];

  return (
    <Box background="neutral0" borderColor="neutral150" hasRadius padding={5}>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex justifyContent="space-between" alignItems="flex-start" gap={4} wrap="wrap">
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography variant="beta">{cluster.title || cluster.clusterKey}</Typography>
            <Typography variant="pi" textColor="neutral600">
              {cluster.clusterKey}
            </Typography>
          </Flex>
          <Flex gap={2} wrap="wrap">
            <Badge active={Boolean(hubEligibility.eligible)}>
              {hubEligibility.eligible ? 'Elegivel para Hub' : 'Ainda nao elegivel'}
            </Badge>
            <Badge active>{getCount(cluster.pages?.length)} pages publicadas</Badge>
          </Flex>
        </Flex>

        <Flex gap={3} wrap="wrap">
          <Badge>{getCount(cluster.totalTopics)} topics</Badge>
          <Badge>Pending {pendingCount}</Badge>
          <Badge active={Boolean(approvedCount)}>Approved {approvedCount}</Badge>
          <Badge active={Boolean(publishedTopicCount)}>Published topics {publishedTopicCount}</Badge>
          <Badge active={hubEligibility.score >= 80}>Score {getCount(hubEligibility.score)}</Badge>
        </Flex>

        <Box background="neutral100" borderColor="neutral150" hasRadius padding={4}>
          <Flex direction="column" alignItems="stretch" gap={3}>
            <Flex gap={6} wrap="wrap">
              <Box minWidth="180px">
                <Typography variant="sigma" textColor="neutral600">
                  Hub sugerida
                </Typography>
                <Typography fontWeight="bold">{suggestedHub.title || 'n/a'}</Typography>
              </Box>
              <Box minWidth="260px">
                <Typography variant="sigma" textColor="neutral600">
                  URL sugerida
                </Typography>
                <Typography>{buildSuggestedHubUrl(suggestedHub)}</Typography>
              </Box>
            </Flex>

            {reasons.length ? (
              <Box>
                <Typography variant="sigma" textColor="neutral600">
                  Motivos
                </Typography>
                <Flex direction="column" alignItems="stretch" gap={1} paddingTop={1}>
                  {reasons.map((reason) => (
                    <Typography key={reason} variant="pi">
                      OK - {reason}
                    </Typography>
                  ))}
                </Flex>
              </Box>
            ) : null}

            {!hubEligibility.eligible && missingReasons.length ? (
              <Box>
                <Typography variant="sigma" textColor="neutral600">
                  Faltam
                </Typography>
                <Flex direction="column" alignItems="stretch" gap={1} paddingTop={1}>
                  {missingReasons.map((reason) => (
                    <Typography key={reason} variant="pi">
                      - {reason}
                    </Typography>
                  ))}
                </Flex>
              </Box>
            ) : null}
          </Flex>
        </Box>

        <Flex alignItems="flex-start" gap={6} wrap="wrap">
          <Box minWidth="260px" flex="1 1 320px">
            <Typography variant="sigma" textColor="neutral600">
              Top pages
            </Typography>
            {topPages.length ? (
              <Flex direction="column" alignItems="stretch" gap={2} paddingTop={2}>
                {topPages.map((page) => (
                  <Box key={page.pageId || page.id}>
                    <Typography fontWeight="bold">{page.title}</Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {page.slug} | {INTENT_LABELS[page.editorialIntent] || page.editorialIntent || 'n/a'}
                    </Typography>
                  </Box>
                ))}
              </Flex>
            ) : (
              <Typography textColor="neutral600">Nenhuma page publicada neste cluster.</Typography>
            )}
          </Box>

          <Box minWidth="260px" flex="1 1 320px">
            <Typography variant="sigma" textColor="neutral600">
              Top topics
            </Typography>
            {topTopics.length ? (
              <Flex direction="column" alignItems="stretch" gap={2} paddingTop={2}>
                {topTopics.map((topic) => (
                  <Box key={topic.topicId || topic.id}>
                    <Typography fontWeight="bold">{topic.keyword}</Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {STATUS_LABELS[topic.status] || topic.status} |{' '}
                      {INTENT_LABELS[topic.intent] || topic.intent || 'n/a'} | priority {topic.priority}
                    </Typography>
                  </Box>
                ))}
              </Flex>
            ) : (
              <Typography textColor="neutral600">Nenhum topic neste cluster.</Typography>
            )}
          </Box>
        </Flex>
      </Flex>
    </Box>
  );
};

const SeoIntelligencePage = () => {
  const { get, post } = useFetchClient();
  const [activeSection, setActiveSection] = useState('topics');
  const [topics, setTopics] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [status, setStatus] = useState('pending');
  const [intent, setIntent] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClustersLoading, setIsClustersLoading] = useState(false);
  const [updatingTopicId, setUpdatingTopicId] = useState(null);
  const [generatingTopicId, setGeneratingTopicId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [generationResult, setGenerationResult] = useState(null);

  const summary = useMemo(() => {
    return topics.reduce(
      (accumulator, topic) => ({
        ...accumulator,
        [topic.status]: (accumulator[topic.status] || 0) + 1,
      }),
      {}
    );
  }, [topics]);

  const resetFeedback = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setGenerationResult(null);
  };

  const loadTopics = async () => {
    setIsLoading(true);
    resetFeedback();

    try {
      const response = await get(buildTopicsUrl({ status, intent, q: search.trim() }));

      setTopics(Array.isArray(response.data?.topics) ? response.data.topics : []);
    } catch (error) {
      setErrorMessage('Nao foi possivel carregar a fila de topicos.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadClusters = async () => {
    setIsClustersLoading(true);
    resetFeedback();

    try {
      const response = await get(buildClustersUrl());

      setClusters(Array.isArray(response.data?.clusters) ? response.data.clusters : []);
    } catch (error) {
      setErrorMessage('Nao foi possivel carregar os clusters.');
    } finally {
      setIsClustersLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  useEffect(() => {
    if (activeSection === 'clusters' && !clusters.length) {
      loadClusters();
    }
  }, [activeSection]);

  const updateTopicInList = (nextTopic) => {
    setTopics((currentTopics) => {
      return currentTopics.map((topic) => (topic.id === nextTopic.id ? nextTopic : topic));
    });
  };

  const handleAction = async (topic, action) => {
    setUpdatingTopicId(topic.id);
    resetFeedback();

    try {
      const response = await post(`${TOPICS_ENDPOINT}/${topic.id}/${action}`);
      const nextTopic = response.data?.topic;

      if (nextTopic) {
        updateTopicInList(nextTopic);
      }

      if (response.data?.changed) {
        setSuccessMessage(
          action === 'approve'
            ? 'Topic aprovado.'
            : action === 'reject'
              ? 'Topic rejeitado.'
              : 'Topic voltou para pending.'
        );
      } else {
        setSuccessMessage(response.data?.reason || 'Nenhuma alteracao aplicada.');
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.error?.message || 'Nao foi possivel atualizar o topic.');
    } finally {
      setUpdatingTopicId(null);
    }
  };

  const handleGenerate = async (topic) => {
    setGeneratingTopicId(topic.id);
    resetFeedback();

    try {
      const response = await post(`${TOPICS_ENDPOINT}/${topic.id}/generate`);
      const nextTopic = response.data?.topic;
      const generation = response.data?.generation || {};

      if (nextTopic) {
        updateTopicInList(nextTopic);
      }

      setGenerationResult({
        topicId: topic.id,
        keyword: topic.keyword,
        status: nextTopic?.status,
        pageId: generation.pageId,
        publicUrl: generation.publicUrl,
        published: generation.published,
        requiresReview: generation.requiresReview,
        error: generation.error,
        validationErrors: generation.validationErrors || [],
        warnings: generation.warnings || [],
      });

      if (generation.error) {
        setSuccessMessage('Geracao finalizada com erro; o topic voltou para approved.');
      } else if (generation.published) {
        setSuccessMessage('Pagina gerada e publicada.');
      } else if (generation.requiresReview) {
        setSuccessMessage('Pagina gerada e enviada para revisao.');
      } else {
        setSuccessMessage(response.data?.reason || 'Geracao finalizada.');
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.error?.message || 'Nao foi possivel gerar a pagina.');
    } finally {
      setGeneratingTopicId(null);
    }
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    loadTopics();
  };

  return (
    <Main labelledBy="seo-intelligence-title">
      <Box padding={8}>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <Flex direction="column" alignItems="flex-start" gap={2}>
            <Typography variant="alpha" id="seo-intelligence-title">
              SEO Intelligence
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Fila de topicos editoriais descobertos para revisao.
            </Typography>
          </Flex>

          <Flex gap={2} wrap="wrap">
            <Button
              type="button"
              variant={activeSection === 'topics' ? undefined : 'secondary'}
              onClick={() => setActiveSection('topics')}
            >
              Topics
            </Button>
            <Button
              type="button"
              variant={activeSection === 'clusters' ? undefined : 'secondary'}
              onClick={() => setActiveSection('clusters')}
            >
              Clusters
            </Button>
          </Flex>

          {errorMessage ? (
            <Alert closeLabel="Fechar erro" title="Erro" variant="danger">
              {errorMessage}
            </Alert>
          ) : null}

          {successMessage ? (
            <Alert closeLabel="Fechar aviso" title="Fila atualizada" variant="success">
              {successMessage}
            </Alert>
          ) : null}

          {generationResult ? (
            <Box background="neutral0" borderColor="neutral150" hasRadius padding={5}>
              <Flex direction="column" alignItems="stretch" gap={3}>
                <Typography variant="beta">Resultado da geracao</Typography>
                <Flex gap={5} wrap="wrap">
                  <Box minWidth="160px">
                    <Typography variant="sigma" textColor="neutral600">
                      Status
                    </Typography>
                    <Typography>{generationResult.status || 'n/a'}</Typography>
                  </Box>
                  <Box minWidth="120px">
                    <Typography variant="sigma" textColor="neutral600">
                      Page
                    </Typography>
                    <Typography>{generationResult.pageId ? `#${generationResult.pageId}` : 'n/a'}</Typography>
                  </Box>
                  <Box minWidth="160px">
                    <Typography variant="sigma" textColor="neutral600">
                      Publicacao
                    </Typography>
                    <Typography>
                      {generationResult.published
                        ? 'published'
                        : generationResult.requiresReview
                          ? 'requiresReview'
                          : 'notPublished'}
                    </Typography>
                  </Box>
                  <Box minWidth="220px">
                    <Typography variant="sigma" textColor="neutral600">
                      URL
                    </Typography>
                    <Typography>{generationResult.publicUrl || 'n/a'}</Typography>
                  </Box>
                </Flex>
                {generationResult.error ? (
                  <Alert closeLabel="Fechar erro da geracao" title="Erro na geracao" variant="warning">
                    {generationResult.error}
                  </Alert>
                ) : null}
                {generationResult.validationErrors.length ? (
                  <Typography variant="pi" textColor="neutral600">
                    Validacoes: {generationResult.validationErrors.map((item) => item.message || item.code).join(', ')}
                  </Typography>
                ) : null}
                {generationResult.warnings.length ? (
                  <Typography variant="pi" textColor="neutral600">
                    Avisos: {generationResult.warnings.map((item) => item.message || item.code).join(', ')}
                  </Typography>
                ) : null}
              </Flex>
            </Box>
          ) : null}

          {activeSection === 'topics' ? (
            <>
              <Box background="neutral0" borderColor="neutral150" hasRadius padding={5}>
                <form onSubmit={handleFilterSubmit}>
                  <Flex alignItems="flex-end" gap={4} wrap="wrap">
                    <Box flex="1 1 260px">
                      <TextInput
                        label="Buscar keyword"
                        name="keyword-search"
                        value={search}
                        placeholder="notebook custo-beneficio"
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </Box>
                    <Box minWidth="180px">
                      <SingleSelect label="Status" value={status} onChange={setStatus}>
                        {STATUS_OPTIONS.map((option) => (
                          <SingleSelectOption key={option.value || 'all'} value={option.value}>
                            {option.label}
                          </SingleSelectOption>
                        ))}
                      </SingleSelect>
                    </Box>
                    <Box minWidth="210px">
                      <SingleSelect label="Intent" value={intent} onChange={setIntent}>
                        {INTENT_OPTIONS.map((option) => (
                          <SingleSelectOption key={option.value || 'all'} value={option.value}>
                            {option.label}
                          </SingleSelectOption>
                        ))}
                      </SingleSelect>
                    </Box>
                    <Button type="submit" loading={isLoading}>
                      Filtrar
                    </Button>
                    <Button type="button" variant="tertiary" disabled={isLoading} onClick={loadTopics}>
                      Atualizar
                    </Button>
                  </Flex>
                </form>
              </Box>

              <Flex gap={3} wrap="wrap">
                <Badge active>Mostrando {topics.length}</Badge>
                <Badge>Pending {summary.pending || 0}</Badge>
                <Badge active={Boolean(summary.approved)}>Approved {summary.approved || 0}</Badge>
                <Badge>Rejected {summary.rejected || 0}</Badge>
              </Flex>

              {isLoading ? (
                <Flex justifyContent="center" padding={8}>
                  <Loader>Carregando topicos</Loader>
                </Flex>
              ) : null}

              {!isLoading && !topics.length ? (
                <Box background="neutral0" borderColor="neutral150" hasRadius padding={6}>
                  <Typography>Nenhum topic encontrado para os filtros atuais.</Typography>
                </Box>
              ) : null}

              {!isLoading ? (
                <Flex direction="column" alignItems="stretch" gap={3}>
                  {topics.map((topic) => (
                    <TopicRow
                      key={topic.id}
                      topic={topic}
                      onAction={handleAction}
                      onGenerate={handleGenerate}
                      isUpdating={updatingTopicId === topic.id}
                      isGenerating={generatingTopicId === topic.id}
                    />
                  ))}
                </Flex>
              ) : null}
            </>
          ) : (
            <>
              <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
                <Flex direction="column" alignItems="flex-start" gap={1}>
                  <Typography variant="beta">Clusters editoriais</Typography>
                  <Typography textColor="neutral600">
                    Agrupamento read-only de topics e pages publicadas por termo base.
                  </Typography>
                </Flex>
                <Button type="button" variant="tertiary" loading={isClustersLoading} onClick={loadClusters}>
                  Atualizar clusters
                </Button>
              </Flex>

              <Flex gap={3} wrap="wrap">
                <Badge active>Mostrando {clusters.length}</Badge>
              </Flex>

              {isClustersLoading ? (
                <Flex justifyContent="center" padding={8}>
                  <Loader>Carregando clusters</Loader>
                </Flex>
              ) : null}

              {!isClustersLoading && !clusters.length ? (
                <Box background="neutral0" borderColor="neutral150" hasRadius padding={6}>
                  <Typography>Nenhum cluster encontrado.</Typography>
                </Box>
              ) : null}

              {!isClustersLoading ? (
                <Flex direction="column" alignItems="stretch" gap={3}>
                  {clusters.map((cluster) => (
                    <ClusterCard key={cluster.clusterKey} cluster={cluster} />
                  ))}
                </Flex>
              ) : null}
            </>
          )}
        </Flex>
      </Box>
    </Main>
  );
};

export default SeoIntelligencePage;
