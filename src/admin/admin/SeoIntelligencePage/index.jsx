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
const WORKSPACES_ENDPOINT = '/seo-intelligence/workspaces';
const CLUSTERS_ENDPOINT = '/seo-intelligence/clusters';
const DISCOVER_TOPICS_ENDPOINT = '/seo-intelligence/topics/discover';
const DEFAULT_CLUSTER_LIMIT = 50;

const DISCOVERY_SOURCE_OPTIONS = [
  { value: 'templates', label: 'Templates deterministicos' },
  { value: 'trends', label: 'Google Trends' },
  { value: 'both', label: 'Ambos' },
];

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

const SCORE_BREAKDOWN_LABELS = {
  demand: 'Demand',
  clusterGap: 'Cluster gap',
  commercialIntent: 'Commercial intent',
  competitionPenalty: 'Competition',
  freshness: 'Freshness',
};

const SIGNAL_LABELS = {
  position: 'popularidade',
  availability: 'disponibilidade',
  rating: 'avaliacao',
  price: 'preco',
  reviewCount: 'reviews',
  oldPrice: 'desconto',
  brand: 'marca',
  model: 'modelo',
  attributes: 'atributos',
  weight: 'peso',
  battery: 'bateria',
  ram: 'RAM',
  storage: 'SSD/armazenamento',
  processor: 'processador',
  gpu: 'GPU',
  power: 'potencia',
  capacity: 'capacidade',
  cleaning: 'facilidade de limpeza',
};

const DUPLICATION_RISK_LABELS = {
  low: 'Baixo',
  medium: 'Medio',
  high: 'Alto',
};

const normalizeBreakdownItem = (item) => {
  if (item && typeof item === 'object') {
    return {
      value: Number(item.value) || 0,
      reason: item.reason || 'Motivo ainda nao calculado',
    };
  }

  return {
    value: Number(item) || 0,
    reason: 'Execute o refresh de scores para atualizar a explicacao',
  };
};

const getBreakdownEntries = (breakdown = {}) => {
  return Object.keys(SCORE_BREAKDOWN_LABELS).map((key) => ({
    key,
    label: SCORE_BREAKDOWN_LABELS[key],
    ...normalizeBreakdownItem(breakdown?.[key]),
  }));
};

const formatRequiredSignals = (signals = []) => {
  return signals.map((signal) => SIGNAL_LABELS[signal] || signal).join(', ');
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

const getScoreColors = (score) => {
  if (score >= 90) {
    return { background: 'success100', textColor: 'success700' };
  }

  if (score >= 70) {
    return { background: 'primary100', textColor: 'primary700' };
  }

  if (score >= 50) {
    return { background: 'warning100', textColor: 'warning700' };
  }

  return { background: 'neutral150', textColor: 'neutral700' };
};

const TopicScoreBadge = ({ score }) => {
  const normalizedScore = Number(score) || 0;
  const colors = getScoreColors(normalizedScore);

  return (
    <Box background={colors.background} hasRadius paddingLeft={3} paddingRight={3} paddingTop={1} paddingBottom={1}>
      <Typography fontWeight="bold" textColor={colors.textColor}>
        Score {normalizedScore}
      </Typography>
    </Box>
  );
};

const buildTopicsUrl = ({ status, intent, q, workspaceId }) => {
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

  if (workspaceId) {
    searchParams.set('workspaceId', workspaceId);
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
  const [isScoreExpanded, setIsScoreExpanded] = useState(false);
  const breakdownEntries = getBreakdownEntries(topic.topicScoreBreakdown);
  const selectionPlan = topic.productSelectionPlan || {};
  const duplicationRisk = topic.duplicationRisk || selectionPlan.duplicationRisk || 'high';

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
          <Flex gap={2} wrap="wrap">
            <TopicScoreBadge score={topic.topicScore} />
            <Badge active={getStatusBadgeActive(topic.status)}>
              {STATUS_LABELS[topic.status] || topic.status}
            </Badge>
          </Flex>
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
          <Box minWidth="150px">
            <Typography variant="sigma" textColor="neutral600">
              Fonte
            </Typography>
            <Typography>{topic.source || topic.sourceMarketplace || 'n/a'}</Typography>
          </Box>
          <Box minWidth="160px">
            <Typography variant="sigma" textColor="neutral600">
              Termo pesquisado
            </Typography>
            <Typography>{topic.sourceTerm || 'n/a'}</Typography>
          </Box>
          <Box minWidth="110px">
            <Typography variant="sigma" textColor="neutral600">
              Trend score
            </Typography>
            <Typography>{topic.trendScore ?? 'n/a'}</Typography>
          </Box>
          <Box minWidth="100px">
            <Typography variant="sigma" textColor="neutral600">
              Priority
            </Typography>
            <Typography>{topic.priority ?? 'n/a'}</Typography>
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

        <Flex gap={5} wrap="wrap">
          <Box minWidth="220px" flex="1 1 280px">
            <Typography variant="sigma" textColor="neutral600">
              Cluster key
            </Typography>
            <Typography>{topic.clusterKey || 'n/a'}</Typography>
          </Box>
          <Box minWidth="260px" flex="1 1 340px">
            <Typography variant="sigma" textColor="neutral600">
              Editorial key
            </Typography>
            <Typography>{topic.editorialKey || 'n/a'}</Typography>
          </Box>
          <Box minWidth="140px">
            <Typography variant="sigma" textColor="neutral600">
              Risco de duplicacao
            </Typography>
            <Badge active={duplicationRisk === 'high'}>
              {DUPLICATION_RISK_LABELS[duplicationRisk] || duplicationRisk}
            </Badge>
          </Box>
        </Flex>

        <Box background="neutral100" borderColor="neutral150" hasRadius padding={4}>
          <Flex direction="column" alignItems="stretch" gap={3}>
            <Box>
              <Typography variant="sigma" textColor="neutral600">
                Como esta pagina deve se diferenciar
              </Typography>
              <Typography>
                {selectionPlan.rankingDifferentiation || 'Plano de diferenciacao indisponivel.'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="sigma" textColor="neutral600">
                Sinais necessarios
              </Typography>
              <Typography>
                {formatRequiredSignals(selectionPlan.requiredSignals) || 'n/a'}
              </Typography>
            </Box>
          </Flex>
        </Box>

        {topic.productConstraint?.type === 'brand' ? (
          <Alert closeLabel="Fechar alerta de restricao" title={topic.productConstraint.label} variant="warning">
            {topic.productConstraint.warning}
          </Alert>
        ) : null}

        <Box>
          <Flex direction="column" alignItems="stretch" gap={3}>
            <Flex justifyContent="space-between" alignItems="center" gap={3} wrap="wrap">
              <Typography variant="pi" textColor="neutral600">
                {breakdownEntries
                  .map((item) => `${item.label} ${item.value > 0 ? '+' : ''}${item.value}`)
                  .join(' | ')}
              </Typography>
              <Button
                type="button"
                size="S"
                variant="tertiary"
                onClick={() => setIsScoreExpanded((current) => !current)}
              >
                {isScoreExpanded ? 'Ocultar detalhes' : 'Por que esse score?'}
              </Button>
            </Flex>

            {isScoreExpanded ? (
              <Box background="neutral100" borderColor="neutral150" hasRadius padding={4}>
                <Flex direction="column" alignItems="stretch" gap={3}>
                  {breakdownEntries.map((item) => (
                    <Box key={item.key}>
                      <Typography fontWeight="bold">
                        {item.value > 0 ? '+' : ''}{item.value} {item.label}
                      </Typography>
                      <Typography variant="pi" textColor="neutral600">
                        {item.reason}
                      </Typography>
                    </Box>
                  ))}

                  {selectionPlan.productSelectionRules?.length ? (
                    <Box>
                      <Typography fontWeight="bold">Regras de selecao planejadas</Typography>
                      <Flex direction="column" alignItems="stretch" gap={1} paddingTop={2}>
                        {selectionPlan.productSelectionRules.map((rule) => (
                          <Typography key={rule} variant="pi" textColor="neutral600">
                            - {rule}
                          </Typography>
                        ))}
                      </Flex>
                    </Box>
                  ) : null}
                </Flex>
              </Box>
            ) : null}
          </Flex>
        </Box>

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

const WorkspaceRow = ({ workspace, onOpen }) => (
  <Box background="neutral0" borderColor="neutral150" hasRadius padding={5}>
    <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
      <Flex direction="column" alignItems="flex-start" gap={1} minWidth="220px">
        <Typography variant="beta">{workspace.name}</Typography>
        <Typography variant="pi" textColor="neutral600">
          Termo: {workspace.sourceKeyword} | Atualizado em {formatDate(workspace.updatedAt)}
        </Typography>
      </Flex>
      <Flex gap={3} wrap="wrap">
        <Badge active>{workspace.totalTopics} topicos</Badge>
        <Badge>{workspace.pendingTopics} pending</Badge>
        <Badge active={Boolean(workspace.approvedTopics)}>
          {workspace.approvedTopics} aprovados
        </Badge>
        <Badge active={Boolean(workspace.publishedTopics)}>
          {workspace.publishedTopics} publicados
        </Badge>
      </Flex>
      <Button type="button" variant="secondary" onClick={() => onOpen(workspace)}>
        Abrir topics
      </Button>
    </Flex>
  </Box>
);

const SeoIntelligencePage = () => {
  const { get, post } = useFetchClient();
  const [activeSection, setActiveSection] = useState('workspaces');
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [topics, setTopics] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [status, setStatus] = useState('pending');
  const [intent, setIntent] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWorkspacesLoading, setIsWorkspacesLoading] = useState(false);
  const [isClustersLoading, setIsClustersLoading] = useState(false);
  const [updatingTopicId, setUpdatingTopicId] = useState(null);
  const [generatingTopicId, setGeneratingTopicId] = useState(null);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [discoveryTerm, setDiscoveryTerm] = useState('');
  const [discoverySource, setDiscoverySource] = useState('both');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [generationResult, setGenerationResult] = useState(null);
  const [bulkGenerationResult, setBulkGenerationResult] = useState(null);

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
    setBulkGenerationResult(null);
  };

  const loadTopics = async ({
    statusValue = status,
    intentValue = intent,
    searchValue = search,
    workspaceId = selectedWorkspace?.id,
  } = {}) => {
    setIsLoading(true);
    resetFeedback();

    try {
      const response = await get(buildTopicsUrl({
        status: statusValue,
        intent: intentValue,
        q: searchValue.trim(),
        workspaceId,
      }));

      setTopics(Array.isArray(response.data?.topics) ? response.data.topics : []);
    } catch (error) {
      setErrorMessage('Nao foi possivel carregar a fila de topicos.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkspaces = async () => {
    setIsWorkspacesLoading(true);

    try {
      const response = await get(WORKSPACES_ENDPOINT);

      setWorkspaces(Array.isArray(response.data?.workspaces) ? response.data.workspaces : []);
    } catch (error) {
      setErrorMessage('Nao foi possivel carregar as pesquisas editoriais.');
    } finally {
      setIsWorkspacesLoading(false);
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
    loadWorkspaces();
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

  const openWorkspace = async (workspace) => {
    setSelectedWorkspace(workspace);
    setStatus('');
    setIntent('');
    setSearch('');
    setActiveSection('topics');
    await loadTopics({
      statusValue: '',
      intentValue: '',
      searchValue: '',
      workspaceId: workspace.id,
    });
  };

  const openAllTopics = async () => {
    setSelectedWorkspace(null);
    setStatus('');
    setIntent('');
    setSearch('');
    setActiveSection('topics');
    await loadTopics({
      statusValue: '',
      intentValue: '',
      searchValue: '',
      workspaceId: null,
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
      await loadWorkspaces();
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

  const handleBulkGenerate = async () => {
    setIsBulkGenerating(true);
    resetFeedback();

    try {
      const response = await post(`${TOPICS_ENDPOINT}/bulk-generate`, { limit: 5 });
      const result = response.data || {};

      setBulkGenerationResult({
        attempted: result.attempted || 0,
        generated: result.generated || 0,
        reused: result.reused || 0,
        failed: result.failed || 0,
        results: Array.isArray(result.results) ? result.results : [],
      });
      setSuccessMessage(
        result.attempted
          ? 'Geracao em lote finalizada.'
          : 'Nenhum topic approved disponivel para gerar.'
      );
    } catch (error) {
      setErrorMessage(error.response?.data?.error?.message || 'Nao foi possivel executar a geracao em lote.');
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const handleDiscoverTopics = async (event) => {
    event.preventDefault();

    const term = discoveryTerm.trim();

    if (!term) {
      setErrorMessage('Informe um termo base para descobrir topicos.');
      return;
    }

    setIsDiscovering(true);
    resetFeedback();
    setDiscoveryResult(null);

    try {
      const response = await post(DISCOVER_TOPICS_ENDPOINT, {
        term,
        source: discoverySource,
      });
      const result = response.data || {};

      await loadWorkspaces();
      setDiscoveryResult({
        created: result.created || 0,
        updated: result.updated || 0,
        skipped: result.skipped || 0,
        scored: result.scored || 0,
        warnings: Array.isArray(result.warnings) ? result.warnings : [],
        workspace: result.workspace || null,
      });
      setSuccessMessage('Descoberta concluida e pesquisa editorial atualizada.');
    } catch (error) {
      const status = error.response?.status || error.response?.data?.error?.status;
      const message = status === 429
        ? 'Google Trends limitou temporariamente as requisicoes. Tente novamente depois.'
        : error.response?.data?.error?.message || 'Nao foi possivel descobrir topicos agora.';

      setErrorMessage(message);
    } finally {
      setIsDiscovering(false);
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
              Pesquisas editoriais organizadas por termo de descoberta.
            </Typography>
          </Flex>

          <Flex gap={2} wrap="wrap">
            <Button
              type="button"
              variant={activeSection === 'workspaces' ? undefined : 'secondary'}
              onClick={() => {
                setActiveSection('workspaces');
                loadWorkspaces();
              }}
            >
              Pesquisas
            </Button>
            <Button
              type="button"
              variant={activeSection === 'topics' && !selectedWorkspace ? undefined : 'secondary'}
              onClick={openAllTopics}
            >
              Todos os topics
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

          {bulkGenerationResult ? (
            <Box background="neutral0" borderColor="neutral150" hasRadius padding={5}>
              <Flex direction="column" alignItems="stretch" gap={3}>
                <Typography variant="beta">Resultado da geracao em lote</Typography>
                <Flex gap={3} wrap="wrap">
                  <Badge active>Tentados {bulkGenerationResult.attempted}</Badge>
                  <Badge active={Boolean(bulkGenerationResult.generated)}>
                    Gerados {bulkGenerationResult.generated}
                  </Badge>
                  <Badge active={Boolean(bulkGenerationResult.reused)}>
                    Reutilizados {bulkGenerationResult.reused}
                  </Badge>
                  <Badge active={Boolean(bulkGenerationResult.failed)}>
                    Falharam {bulkGenerationResult.failed}
                  </Badge>
                </Flex>
                {bulkGenerationResult.results.map((result) => (
                  <Typography key={result.topicId} variant="pi" textColor="neutral600">
                    #{result.topicId} | score {result.score} | {result.action} | {result.keyword}
                    {result.error ? ` | ${result.error}` : ''}
                  </Typography>
                ))}
              </Flex>
            </Box>
          ) : null}

          {activeSection === 'workspaces' ? (
            <>
              <Box background="neutral0" borderColor="neutral150" hasRadius padding={5}>
                <form onSubmit={handleDiscoverTopics}>
                  <Flex direction="column" alignItems="stretch" gap={4}>
                    <Flex direction="column" alignItems="flex-start" gap={1}>
                      <Typography variant="beta">Descobrir topicos</Typography>
                      <Typography textColor="neutral600">
                        Importe oportunidades como pending usando templates, Google Trends ou ambos.
                      </Typography>
                    </Flex>

                    <Flex alignItems="flex-end" gap={4} wrap="wrap">
                      <Box flex="1 1 280px">
                        <TextInput
                          label="Termo base"
                          name="discovery-term"
                          value={discoveryTerm}
                          placeholder="notebook"
                          onChange={(event) => setDiscoveryTerm(event.target.value)}
                        />
                      </Box>
                      <Box minWidth="230px">
                        <SingleSelect
                          label="Fonte"
                          value={discoverySource}
                          onChange={setDiscoverySource}
                        >
                          {DISCOVERY_SOURCE_OPTIONS.map((option) => (
                            <SingleSelectOption key={option.value} value={option.value}>
                              {option.label}
                            </SingleSelectOption>
                          ))}
                        </SingleSelect>
                      </Box>
                      <Button type="submit" loading={isDiscovering}>
                        Descobrir e importar
                      </Button>
                    </Flex>
                  </Flex>
                </form>

                {discoveryResult ? (
                  <Flex direction="column" alignItems="stretch" gap={3} paddingTop={5}>
                    {discoveryResult.workspace ? (
                      <Typography fontWeight="bold">
                        Pesquisa: {discoveryResult.workspace.name}
                      </Typography>
                    ) : null}
                    <Flex gap={3} wrap="wrap">
                      <Badge active={Boolean(discoveryResult.created)}>
                        Criados {discoveryResult.created}
                      </Badge>
                      <Badge active={Boolean(discoveryResult.updated)}>
                        Atualizados {discoveryResult.updated}
                      </Badge>
                      <Badge>Ignorados {discoveryResult.skipped}</Badge>
                      <Badge active={Boolean(discoveryResult.scored)}>
                        Pontuados {discoveryResult.scored}
                      </Badge>
                    </Flex>

                    {discoveryResult.warnings.map((warning, index) => (
                      <Alert
                        key={`${warning.code || 'warning'}-${index}`}
                        closeLabel="Fechar aviso"
                        title="Aviso"
                        variant="warning"
                      >
                        {warning.message || warning.reason || 'A fonte retornou um aviso.'}
                      </Alert>
                    ))}
                  </Flex>
                ) : null}
              </Box>

              <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
                <Flex direction="column" alignItems="flex-start" gap={1}>
                  <Typography variant="beta">Pesquisas recentes</Typography>
                  <Typography textColor="neutral600">
                    Abra uma pesquisa para revisar somente os topics daquele termo.
                  </Typography>
                </Flex>
                <Button type="button" variant="tertiary" loading={isWorkspacesLoading} onClick={loadWorkspaces}>
                  Atualizar pesquisas
                </Button>
              </Flex>

              {isWorkspacesLoading ? (
                <Flex justifyContent="center" padding={8}>
                  <Loader>Carregando pesquisas</Loader>
                </Flex>
              ) : null}

              {!isWorkspacesLoading && !workspaces.length ? (
                <Box background="neutral0" borderColor="neutral150" hasRadius padding={6}>
                  <Typography>Nenhuma pesquisa encontrada. Descubra o primeiro termo acima.</Typography>
                </Box>
              ) : null}

              {!isWorkspacesLoading ? (
                <Flex direction="column" alignItems="stretch" gap={3}>
                  {workspaces.map((workspace) => (
                    <WorkspaceRow key={workspace.id} workspace={workspace} onOpen={openWorkspace} />
                  ))}
                </Flex>
              ) : null}
            </>
          ) : activeSection === 'topics' ? (
            <>
              <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
                <Flex direction="column" alignItems="flex-start" gap={1}>
                  <Typography variant="beta">
                    {selectedWorkspace ? selectedWorkspace.name : 'Todos os topics'}
                  </Typography>
                  <Typography textColor="neutral600">
                    {selectedWorkspace
                      ? `Topics descobertos a partir de ${selectedWorkspace.sourceKeyword}.`
                      : 'Visao global para auditoria de todos os topics.'}
                  </Typography>
                </Flex>
                {selectedWorkspace ? (
                  <Button type="button" variant="tertiary" onClick={() => setActiveSection('workspaces')}>
                    Voltar para pesquisas
                  </Button>
                ) : null}
              </Flex>

              <Box background="neutral0" borderColor="neutral150" hasRadius padding={5}>
                <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography variant="beta">Geracao controlada</Typography>
                    <Typography textColor="neutral600">
                      Somente topics aprovados serao gerados. Ordenacao por score.
                    </Typography>
                  </Flex>
                  <Button type="button" loading={isBulkGenerating} onClick={handleBulkGenerate}>
                    Gerar Top 5 Aprovados
                  </Button>
                </Flex>
              </Box>

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
