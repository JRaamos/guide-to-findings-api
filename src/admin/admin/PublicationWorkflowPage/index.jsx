import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Flex,
  Loader,
  Main,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

const PAGES_ENDPOINT = '/api/internal/publication/pages';

const PublicationWorkflowPage = () => {
  const { get, post } = useFetchClient();
  const [pages, setPages] = useState([]);
  const [pageId, setPageId] = useState('');
  const [currentPage, setCurrentPage] = useState(null);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const resetFeedback = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const loadPages = async () => {
    setIsLoadingPages(true);

    try {
      const response = await get(PAGES_ENDPOINT);
      setPages(Array.isArray(response.data?.pages) ? response.data.pages : []);
    } catch (error) {
      setErrorMessage('Nao foi possivel carregar as paginas para publicacao.');
    } finally {
      setIsLoadingPages(false);
    }
  };

  const loadPage = async (id) => {
    resetFeedback();
    setIsLoadingPage(true);

    try {
      const response = await get(`${PAGES_ENDPOINT}/${id}`);
      const page = response.data?.page;

      setCurrentPage(page);
      setPageId(page?.id ? String(page.id) : String(id));
    } catch (error) {
      setErrorMessage('Nao foi possivel carregar a pagina informada.');
    } finally {
      setIsLoadingPage(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  const handleLoadById = async (event) => {
    event.preventDefault();

    const parsedPageId = Number(pageId);

    if (!Number.isInteger(parsedPageId) || parsedPageId <= 0) {
      setErrorMessage('Informe um pageId valido.');
      return;
    }

    await loadPage(parsedPageId);
  };

  const handleApprove = async () => {
    if (!currentPage?.id) {
      setErrorMessage('Carregue uma pagina antes de aprovar.');
      return;
    }

    resetFeedback();
    setIsApproving(true);

    try {
      const response = await post(`${PAGES_ENDPOINT}/${currentPage.id}/approve`, {});
      setCurrentPage(response.data?.page || null);
      setSuccessMessage('Page, Seo e Faqs aprovados com sucesso.');
      await loadPages();
    } catch (error) {
      setErrorMessage('Nao foi possivel aprovar a pagina.');
    } finally {
      setIsApproving(false);
    }
  };

  const handlePublish = async () => {
    if (!currentPage?.id) {
      setErrorMessage('Carregue uma pagina antes de publicar.');
      return;
    }

    resetFeedback();
    setIsPublishing(true);

    try {
      const response = await post(`${PAGES_ENDPOINT}/${currentPage.id}/publish`, {});
      setCurrentPage(response.data?.page || null);
      setSuccessMessage('Pagina publicada com sucesso.');
      await loadPages();
    } catch (error) {
      setErrorMessage('Nao foi possivel publicar. Verifique as validacoes pendentes.');
    } finally {
      setIsPublishing(false);
    }
  };

  const pendingValidations = currentPage?.publicationReadiness?.pending || [];
  const isBusy = isLoadingPage || isApproving || isPublishing;

  return (
    <Main labelledBy="publication-workflow-title">
      <Box padding={8}>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <Flex direction="column" alignItems="flex-start" gap={2}>
            <Typography variant="alpha" id="publication-workflow-title">
              Publication Workflow
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Aprove e publique paginas geradas em draft. A publicacao exige Page, Seo, Faqs e
              Ranking prontos.
            </Typography>
          </Flex>

          {errorMessage ? (
            <Alert
              closeLabel="Fechar alerta de erro"
              title="Erro"
              variant="danger"
              onClose={() => setErrorMessage('')}
            >
              {errorMessage}
            </Alert>
          ) : null}

          {successMessage ? (
            <Alert
              closeLabel="Fechar alerta de sucesso"
              title="Sucesso"
              variant="success"
              onClose={() => setSuccessMessage('')}
            >
              {successMessage}
            </Alert>
          ) : null}

          <Flex gap={6} alignItems="flex-start" wrap="wrap">
            <Box
              background="neutral0"
              borderColor="neutral150"
              flex="1 1 360px"
              hasRadius
              padding={6}
              shadow="filterShadow"
            >
              <Flex direction="column" alignItems="stretch" gap={4}>
                <Flex justifyContent="space-between" alignItems="center" gap={4}>
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography variant="beta">Paginas em workflow</Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {pages.length} pagina(s) encontrada(s)
                    </Typography>
                  </Flex>
                  <Button type="button" variant="secondary" onClick={loadPages}>
                    Atualizar
                  </Button>
                </Flex>

                {isLoadingPages ? (
                  <Flex justifyContent="center" padding={6}>
                    <Loader>Carregando paginas</Loader>
                  </Flex>
                ) : null}

                {!isLoadingPages && !pages.length ? (
                  <Box padding={5} background="neutral100" hasRadius>
                    <Typography textColor="neutral600">
                      Nenhuma pagina draft ou review encontrada.
                    </Typography>
                  </Box>
                ) : null}

                {!isLoadingPages && pages.length ? (
                  <Flex direction="column" alignItems="stretch" gap={3}>
                    {pages.map((page) => (
                      <Box key={page.id} padding={4} background="neutral100" hasRadius>
                        <Flex justifyContent="space-between" alignItems="center" gap={4}>
                          <Flex direction="column" alignItems="flex-start" gap={1}>
                            <Typography variant="omega" fontWeight="bold">
                              {page.title}
                            </Typography>
                            <Typography variant="pi" textColor="neutral600">
                              ID {page.id} | {page.status} | SEO {page.seoStatus || 'sem Seo'} |
                              FAQs {page.faqCount}
                            </Typography>
                          </Flex>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => loadPage(page.id)}
                            disabled={isBusy}
                          >
                            Carregar
                          </Button>
                        </Flex>
                      </Box>
                    ))}
                  </Flex>
                ) : null}
              </Flex>
            </Box>

            <Box
              background="neutral0"
              borderColor="neutral150"
              flex="1 1 420px"
              hasRadius
              padding={6}
              shadow="filterShadow"
            >
              <Flex direction="column" alignItems="stretch" gap={4}>
                <Typography variant="beta">Detalhe da Page</Typography>

                <form onSubmit={handleLoadById}>
                  <Flex gap={3} alignItems="flex-end" wrap="wrap">
                    <Box flex="1 1 180px">
                      <TextInput
                        label="pageId"
                        name="pageId"
                        type="number"
                        value={pageId}
                        onChange={(event) => setPageId(event.target.value)}
                        placeholder="2"
                      />
                    </Box>
                    <Button type="submit" loading={isLoadingPage} disabled={isApproving || isPublishing}>
                      Carregar Page
                    </Button>
                  </Flex>
                </form>

                {currentPage ? (
                  <Flex direction="column" alignItems="stretch" gap={4}>
                    <Box padding={4} background="neutral100" hasRadius>
                      <Flex direction="column" alignItems="flex-start" gap={2}>
                        <Typography variant="omega" fontWeight="bold">
                          {currentPage.title}
                        </Typography>
                        <Typography variant="pi" textColor="neutral700">
                          Slug: {currentPage.slug}
                        </Typography>
                        <Typography variant="pi" textColor="neutral700">
                          Status: {currentPage.status} | approvedAt:{' '}
                          {currentPage.approvedAt || 'pendente'} | publishedAt:{' '}
                          {currentPage.publishedAt || 'pendente'}
                        </Typography>
                        <Typography variant="pi" textColor="neutral700">
                          SEO: {currentPage.seo?.status || 'sem Seo'} | FAQs:{' '}
                          {currentPage.faqs?.length || 0} | Ranking:{' '}
                          {currentPage.ranking?.id || 'sem Ranking'}
                        </Typography>
                      </Flex>
                    </Box>

                    <Box padding={4} background="neutral100" hasRadius>
                      <Flex direction="column" alignItems="flex-start" gap={2}>
                        <Typography variant="omega" fontWeight="bold">
                          Validacoes pendentes
                        </Typography>
                        {!pendingValidations.length ? (
                          <Typography variant="pi" textColor="success600">
                            Nenhuma pendencia encontrada.
                          </Typography>
                        ) : (
                          pendingValidations.map((validation) => (
                            <Typography key={validation.key} variant="pi" textColor="danger600">
                              {validation.key}: {validation.message}
                            </Typography>
                          ))
                        )}
                      </Flex>
                    </Box>

                    <Flex gap={3} wrap="wrap">
                      <Button
                        type="button"
                        onClick={handleApprove}
                        loading={isApproving}
                        disabled={isLoadingPage || isPublishing || currentPage.status === 'published'}
                      >
                        Aprovar
                      </Button>
                      <Button
                        type="button"
                        onClick={handlePublish}
                        loading={isPublishing}
                        disabled={isLoadingPage || isApproving || currentPage.status === 'published'}
                      >
                        Publicar
                      </Button>
                    </Flex>
                  </Flex>
                ) : (
                  <Box padding={5} background="neutral100" hasRadius>
                    <Typography textColor="neutral600">
                      Carregue uma pagina da lista ou informe um pageId.
                    </Typography>
                  </Box>
                )}
              </Flex>
            </Box>
          </Flex>
        </Flex>
      </Box>
    </Main>
  );
};

export default PublicationWorkflowPage;
