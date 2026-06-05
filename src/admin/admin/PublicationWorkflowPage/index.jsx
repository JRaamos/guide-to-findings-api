import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Flex,
  Loader,
  Main,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Textarea,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

const PAGES_ENDPOINT = '/api/internal/publication/pages';
const ROBOTS_OPTIONS = ['indexFollow', 'noIndexFollow', 'noIndexNoFollow'];

const createEmptyForm = () => ({
  title: '',
  excerpt: '',
  introduction: '',
  summary: '',
  conclusion: '',
  seo: {
    metaTitle: '',
    metaDescription: '',
    focusKeyword: '',
    secondaryKeywords: '',
    robots: 'indexFollow',
  },
  faqs: [],
});

const createInitialForm = (page) => {
  const excerpt = page?.excerpt || '';

  return {
    title: page?.title || '',
    excerpt,
    introduction: page?.introduction || page?.intro || '',
    summary: page?.summary || excerpt,
    conclusion: page?.conclusion || '',
    seo: {
      metaTitle: page?.seo?.metaTitle || '',
      metaDescription: page?.seo?.metaDescription || '',
      focusKeyword: page?.seo?.focusKeyword || '',
      secondaryKeywords: Array.isArray(page?.seo?.secondaryKeywords)
        ? page.seo.secondaryKeywords.join(', ')
        : '',
      robots: page?.seo?.robots || 'indexFollow',
    },
    faqs: Array.isArray(page?.faqs)
      ? page.faqs.map((faq) => ({
          id: faq.id,
          question: faq.question || '',
          answer: faq.answer || '',
          order: faq.order,
          status: faq.status || 'active',
        }))
      : [],
  };
};

const getEditableFaqs = (faqs = []) => {
  return faqs.filter((faq) => faq.status !== 'inactive');
};

const normalizeKeywords = (value) => {
  return value
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
};

const EditorialTextarea = ({ id, label, minHeight = '120px', ...props }) => (
  <Flex direction="column" alignItems="stretch" gap={2}>
    <Typography variant="pi" fontWeight="bold" tag="label" htmlFor={id}>
      {label}
    </Typography>
    <Textarea id={id} name={id} minHeight={minHeight} {...props} />
  </Flex>
);

const PublicationWorkflowPage = () => {
  const { get, post, put } = useFetchClient();
  const [pages, setPages] = useState([]);
  const [pageId, setPageId] = useState('');
  const [currentPage, setCurrentPage] = useState(null);
  const [form, setForm] = useState(createEmptyForm);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const editableFaqs = useMemo(() => getEditableFaqs(form.faqs), [form.faqs]);

  const resetFeedback = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const hydratePage = (page) => {
    setCurrentPage(page);
    setForm(createInitialForm(page));
    setPageId(page?.id ? String(page.id) : '');
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

      hydratePage(page);
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

  const updateFormField = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const updateSeoField = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      seo: {
        ...currentForm.seo,
        [field]: value,
      },
    }));
  };

  const updateFaqField = (faqKey, field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      faqs: currentForm.faqs.map((faq) => {
        const key = faq.id || faq.tempId;

        if (key !== faqKey) {
          return faq;
        }

        return {
          ...faq,
          [field]: value,
        };
      }),
    }));
  };

  const handleAddFaq = () => {
    setForm((currentForm) => ({
      ...currentForm,
      faqs: [
        ...currentForm.faqs,
        {
          tempId: `new-${Date.now()}`,
          question: '',
          answer: '',
          order: currentForm.faqs.length + 1,
          status: 'active',
        },
      ],
    }));
  };

  const handleRemoveFaq = (faqKey) => {
    setForm((currentForm) => ({
      ...currentForm,
      faqs: currentForm.faqs
        .map((faq) => {
          const key = faq.id || faq.tempId;

          if (key !== faqKey) {
            return faq;
          }

          if (!faq.id) {
            return null;
          }

          return {
            ...faq,
            status: 'inactive',
          };
        })
        .filter(Boolean),
    }));
  };

  const buildPayload = () => ({
    title: form.title,
    excerpt: form.excerpt,
    introduction: form.introduction,
    summary: form.summary,
    conclusion: form.conclusion,
    seo: {
      metaTitle: form.seo.metaTitle,
      metaDescription: form.seo.metaDescription,
      focusKeyword: form.seo.focusKeyword,
      secondaryKeywords: normalizeKeywords(form.seo.secondaryKeywords),
      robots: form.seo.robots,
    },
    faqs: editableFaqs.map((faq, index) => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      order: index + 1,
      status: 'active',
    })),
  });

  const handleSave = async () => {
    if (!currentPage?.id) {
      setErrorMessage('Carregue uma pagina antes de salvar.');
      return;
    }

    resetFeedback();
    setIsSaving(true);

    try {
      const response = await put(`${PAGES_ENDPOINT}/${currentPage.id}`, buildPayload());
      hydratePage(response.data?.page || null);
      setSuccessMessage('Alteracoes editoriais salvas com sucesso.');
      await loadPages();
    } catch (error) {
      setErrorMessage(error?.response?.data?.error?.message || 'Nao foi possivel salvar a revisao.');
    } finally {
      setIsSaving(false);
    }
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
      hydratePage(response.data?.page || null);
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
      hydratePage(response.data?.page || null);
      setSuccessMessage('Pagina publicada com sucesso.');
      await loadPages();
    } catch (error) {
      setErrorMessage('Nao foi possivel publicar. Verifique as validacoes pendentes.');
    } finally {
      setIsPublishing(false);
    }
  };

  const pendingValidations = currentPage?.publicationReadiness?.pending || [];
  const isBusy = isLoadingPage || isSaving || isApproving || isPublishing;
  const isPublished = currentPage?.status === 'published';

  return (
    <Main labelledBy="publication-workflow-title">
      <Box padding={8}>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <Flex direction="column" alignItems="flex-start" gap={2}>
            <Typography variant="alpha" id="publication-workflow-title">
              Publication Workflow
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Revise Page, Seo e Faqs antes de aprovar e publicar conteudo.
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
              flex="1 1 320px"
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

                <form onSubmit={handleLoadById}>
                  <Flex gap={3} alignItems="flex-end" wrap="wrap">
                    <Box flex="1 1 160px">
                      <TextInput
                        label="pageId"
                        name="pageId"
                        type="number"
                        value={pageId}
                        onChange={(event) => setPageId(event.target.value)}
                        placeholder="2"
                      />
                    </Box>
                    <Button type="submit" loading={isLoadingPage} disabled={isBusy}>
                      Carregar
                    </Button>
                  </Flex>
                </form>

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
                        <Flex direction="column" alignItems="stretch" gap={3}>
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
                            Revisar
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
              flex="2 1 620px"
              hasRadius
              padding={6}
              shadow="filterShadow"
            >
              {!currentPage ? (
                <Box padding={5} background="neutral100" hasRadius>
                  <Typography textColor="neutral600">
                    Carregue uma pagina da lista ou informe um pageId para revisar.
                  </Typography>
                </Box>
              ) : (
                <Flex direction="column" alignItems="stretch" gap={6}>
                  <Flex direction="column" alignItems="flex-start" gap={2}>
                    <Typography variant="beta">Revisao editorial</Typography>
                    <Typography variant="pi" textColor="neutral600">
                      Page {currentPage.id} | {currentPage.status} | Slug {currentPage.slug}
                    </Typography>
                  </Flex>

                  {isPublished ? (
                    <Alert closeLabel="Fechar alerta" title="Page publicada" variant="default">
                      Pages publicadas ficam bloqueadas para edicao nesta V2.
                    </Alert>
                  ) : null}

                  <Flex direction="column" alignItems="stretch" gap={4}>
                    <Typography variant="delta">Dados da Page</Typography>

                    <TextInput
                      label="Title"
                      name="title"
                      value={form.title}
                      onChange={(event) => updateFormField('title', event.target.value)}
                      disabled={isPublished}
                    />

                    <EditorialTextarea
                      id="excerpt"
                      label="Excerpt"
                      value={form.excerpt}
                      onChange={(event) => updateFormField('excerpt', event.target.value)}
                      disabled={isPublished}
                    />

                    <EditorialTextarea
                      id="introduction"
                      label="Introduction"
                      minHeight="160px"
                      value={form.introduction}
                      onChange={(event) => updateFormField('introduction', event.target.value)}
                      disabled={isPublished}
                    />

                    <EditorialTextarea
                      id="summary"
                      label="Summary"
                      value={form.summary}
                      onChange={(event) => updateFormField('summary', event.target.value)}
                      disabled={isPublished}
                    />

                    <EditorialTextarea
                      id="conclusion"
                      label="Conclusion"
                      minHeight="160px"
                      value={form.conclusion}
                      onChange={(event) => updateFormField('conclusion', event.target.value)}
                      disabled={isPublished}
                    />
                  </Flex>

                  <Flex direction="column" alignItems="stretch" gap={4}>
                    <Typography variant="delta">SEO</Typography>

                    <TextInput
                      label="Meta Title"
                      name="metaTitle"
                      value={form.seo.metaTitle}
                      onChange={(event) => updateSeoField('metaTitle', event.target.value)}
                      disabled={isPublished}
                    />

                    <EditorialTextarea
                      id="metaDescription"
                      label="Meta Description"
                      value={form.seo.metaDescription}
                      onChange={(event) => updateSeoField('metaDescription', event.target.value)}
                      disabled={isPublished}
                    />

                    <Flex gap={4} alignItems="flex-start" wrap="wrap">
                      <Box flex="1 1 220px">
                        <TextInput
                          label="Focus Keyword"
                          name="focusKeyword"
                          value={form.seo.focusKeyword}
                          onChange={(event) => updateSeoField('focusKeyword', event.target.value)}
                          disabled={isPublished}
                        />
                      </Box>
                      <Box flex="1 1 260px">
                        <TextInput
                          label="Secondary Keywords"
                          name="secondaryKeywords"
                          value={form.seo.secondaryKeywords}
                          onChange={(event) =>
                            updateSeoField('secondaryKeywords', event.target.value)
                          }
                          disabled={isPublished}
                          placeholder="keyword 1, keyword 2"
                        />
                      </Box>
                      <Box flex="1 1 220px">
                        <Flex direction="column" alignItems="stretch" gap={2}>
                          <Typography variant="pi" fontWeight="bold" tag="label" htmlFor="robots">
                            Robots
                          </Typography>
                          <SingleSelect
                            id="robots"
                            name="robots"
                            value={form.seo.robots}
                            onChange={(value) => updateSeoField('robots', value)}
                            disabled={isPublished}
                          >
                            {ROBOTS_OPTIONS.map((option) => (
                              <SingleSelectOption key={option} value={option}>
                                {option}
                              </SingleSelectOption>
                            ))}
                          </SingleSelect>
                        </Flex>
                      </Box>
                    </Flex>
                  </Flex>

                  <Flex direction="column" alignItems="stretch" gap={4}>
                    <Flex justifyContent="space-between" alignItems="center" gap={4}>
                      <Typography variant="delta">FAQ</Typography>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleAddFaq}
                        disabled={isPublished}
                      >
                        Adicionar FAQ
                      </Button>
                    </Flex>

                    {!editableFaqs.length ? (
                      <Box padding={5} background="neutral100" hasRadius>
                        <Typography textColor="neutral600">Nenhuma FAQ ativa nesta revisao.</Typography>
                      </Box>
                    ) : null}

                    {editableFaqs.map((faq, index) => {
                      const faqKey = faq.id || faq.tempId;

                      return (
                        <Box key={faqKey} padding={4} background="neutral100" hasRadius>
                          <Flex direction="column" alignItems="stretch" gap={3}>
                            <Flex justifyContent="space-between" alignItems="center" gap={4}>
                              <Typography variant="omega" fontWeight="bold">
                                FAQ {index + 1}
                              </Typography>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => handleRemoveFaq(faqKey)}
                                disabled={isPublished}
                              >
                                Remover
                              </Button>
                            </Flex>
                            <TextInput
                              label="Pergunta"
                              name={`faq-${faqKey}-question`}
                              value={faq.question}
                              onChange={(event) =>
                                updateFaqField(faqKey, 'question', event.target.value)
                              }
                              disabled={isPublished}
                            />
                            <EditorialTextarea
                              id={`faq-${faqKey}-answer`}
                              label="Resposta"
                              value={faq.answer}
                              onChange={(event) =>
                                updateFaqField(faqKey, 'answer', event.target.value)
                              }
                              disabled={isPublished}
                            />
                          </Flex>
                        </Box>
                      );
                    })}
                  </Flex>

                  <Flex gap={3} wrap="wrap">
                    <Button
                      type="button"
                      onClick={handleSave}
                      loading={isSaving}
                      disabled={isLoadingPage || isApproving || isPublishing || isPublished}
                    >
                      Salvar alteracoes
                    </Button>
                    <Button
                      type="button"
                      onClick={handleApprove}
                      loading={isApproving}
                      disabled={isLoadingPage || isSaving || isPublishing || isPublished}
                    >
                      Aprovar
                    </Button>
                    <Button
                      type="button"
                      onClick={handlePublish}
                      loading={isPublishing}
                      disabled={isLoadingPage || isSaving || isApproving || isPublished}
                    >
                      Publicar
                    </Button>
                  </Flex>
                </Flex>
              )}
            </Box>

            {currentPage ? (
              <Box
                background="neutral0"
                borderColor="neutral150"
                flex="1 1 360px"
                hasRadius
                padding={6}
                shadow="filterShadow"
              >
                <Flex direction="column" alignItems="stretch" gap={5}>
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography variant="beta">Preview</Typography>
                    <Typography variant="pi" textColor="neutral600">
                      Preview editorial simples, sem renderizacao do frontend.
                    </Typography>
                  </Flex>

                  <Box padding={4} background="neutral100" hasRadius>
                    <Flex direction="column" alignItems="stretch" gap={3}>
                      <Typography variant="alpha">{form.title || 'Sem titulo'}</Typography>
                      <Typography textColor="neutral700">{form.introduction || 'Sem introducao'}</Typography>
                      <Typography textColor="neutral700">{form.summary || 'Sem resumo'}</Typography>
                      {editableFaqs.length ? (
                        <Flex direction="column" alignItems="stretch" gap={2}>
                          <Typography variant="omega" fontWeight="bold">
                            FAQs
                          </Typography>
                          {editableFaqs.map((faq, index) => (
                            <Box key={faq.id || faq.tempId || index} padding={3} background="neutral0" hasRadius>
                              <Typography variant="pi" fontWeight="bold">
                                {faq.question || 'Pergunta sem texto'}
                              </Typography>
                              <Typography variant="pi" textColor="neutral700">
                                {faq.answer || 'Resposta sem texto'}
                              </Typography>
                            </Box>
                          ))}
                        </Flex>
                      ) : null}
                      <Typography textColor="neutral700">{form.conclusion || 'Sem conclusao'}</Typography>
                    </Flex>
                  </Box>

                  <Box padding={4} background="neutral100" hasRadius>
                    <Flex direction="column" alignItems="flex-start" gap={2}>
                      <Typography variant="omega" fontWeight="bold">
                        Status
                      </Typography>
                      <Typography variant="pi" textColor="neutral700">
                        Page: {currentPage.status}
                      </Typography>
                      <Typography variant="pi" textColor="neutral700">
                        approvedAt: {currentPage.approvedAt || 'pendente'}
                      </Typography>
                      <Typography variant="pi" textColor="neutral700">
                        publishedAt: {currentPage.publishedAt || 'pendente'}
                      </Typography>
                      <Typography variant="pi" textColor="neutral700">
                        SEO: {currentPage.seo?.status || 'sem Seo'}
                      </Typography>
                      <Typography variant="pi" textColor="neutral700">
                        Ranking: {currentPage.ranking?.id || 'sem Ranking'}
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
                </Flex>
              </Box>
            ) : null}
          </Flex>
        </Flex>
      </Box>
    </Main>
  );
};

export default PublicationWorkflowPage;
