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

const TopicActions = ({ topic, onAction, isUpdating }) => {
  const isLocked = topic.status === 'processing' || topic.status === 'published';

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
    </Flex>
  );
};

const TopicRow = ({ topic, onAction, isUpdating }) => {
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
        </Flex>

        <TopicActions topic={topic} onAction={onAction} isUpdating={isUpdating} />
      </Flex>
    </Box>
  );
};

const SeoIntelligencePage = () => {
  const { get, post } = useFetchClient();
  const [topics, setTopics] = useState([]);
  const [status, setStatus] = useState('pending');
  const [intent, setIntent] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [updatingTopicId, setUpdatingTopicId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  useEffect(() => {
    loadTopics();
  }, []);

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
                  isUpdating={updatingTopicId === topic.id}
                />
              ))}
            </Flex>
          ) : null}
        </Flex>
      </Box>
    </Main>
  );
};

export default SeoIntelligencePage;
