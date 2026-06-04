import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Flex,
  Loader,
  Main,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

const RANKINGS_ENDPOINT = '/api/internal/rankings';
const PRODUCTS_ENDPOINT = '/api/internal/rankings/products';

const normalizeId = (value) => {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
};

const slugify = (value = '') => {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
};

const formatPrice = (product) => {
  if (product.price === null || product.price === undefined) {
    return 'Preco nao informado';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: product.currency || 'BRL',
  }).format(product.price);
};

const mergeProducts = (currentProducts, incomingProducts) => {
  const productMap = new Map();

  [...currentProducts, ...incomingProducts].forEach((product) => {
    if (product?.id) {
      productMap.set(product.id, product);
    }
  });

  return Array.from(productMap.values()).sort((left, right) =>
    String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR')
  );
};

const getRankingItemsPayload = (selectedProductIds, productPositions) => {
  const positions = new Set();

  return selectedProductIds.map((productId) => {
    const position = Number(productPositions[productId]);

    if (!Number.isInteger(position) || position <= 0) {
      throw new Error('Informe uma posicao valida para todos os produtos selecionados.');
    }

    if (positions.has(position)) {
      throw new Error(`A posicao ${position} foi usada mais de uma vez.`);
    }

    positions.add(position);

    return {
      productId,
      position,
    };
  });
};

const RankingBuilderPage = () => {
  const { get, post, put } = useFetchClient();
  const [rankingId, setRankingId] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [rankings, setRankings] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [productPositions, setProductPositions] = useState({});
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const selectedProducts = useMemo(() => {
    const selectedSet = new Set(selectedProductIds);

    return products.filter((product) => selectedSet.has(product.id));
  }, [products, selectedProductIds]);

  const resetFeedback = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const loadRankings = async () => {
    setIsLoadingRankings(true);

    try {
      const response = await get(RANKINGS_ENDPOINT);
      setRankings(Array.isArray(response.data?.rankings) ? response.data.rankings : []);
    } catch (error) {
      setErrorMessage('Nao foi possivel carregar os rankings existentes.');
    } finally {
      setIsLoadingRankings(false);
    }
  };

  useEffect(() => {
    loadRankings();
  }, []);

  const handleTitleChange = (event) => {
    const value = event.target.value;

    setTitle(value);

    if (!slug) {
      setSlug(slugify(value));
    }
  };

  const handleLoadProducts = async () => {
    resetFeedback();
    setIsLoadingProducts(true);

    try {
      const params = new URLSearchParams();
      const parsedCategoryId = normalizeId(categoryId);
      const parsedSubCategoryId = normalizeId(subCategoryId);

      if (parsedCategoryId) {
        params.set('categoryId', String(parsedCategoryId));
      }

      if (parsedSubCategoryId) {
        params.set('subCategoryId', String(parsedSubCategoryId));
      }

      const queryString = params.toString();
      const response = await get(`${PRODUCTS_ENDPOINT}${queryString ? `?${queryString}` : ''}`);
      const availableProducts = Array.isArray(response.data?.products)
        ? response.data.products
        : [];

      setProducts((currentProducts) => mergeProducts(currentProducts, availableProducts));

      if (!availableProducts.length) {
        setSuccessMessage('Nenhum produto disponivel para os filtros informados.');
      }
    } catch (error) {
      setErrorMessage('Nao foi possivel carregar os produtos disponiveis.');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleLoadRanking = async (id) => {
    resetFeedback();
    setIsLoadingRanking(true);

    try {
      const response = await get(`${RANKINGS_ENDPOINT}/${id}`);
      const ranking = response.data?.ranking;

      if (!ranking?.id) {
        throw new Error('Ranking not found');
      }

      const rankingItems = Array.isArray(ranking?.items) ? ranking.items : [];
      const rankingProducts = rankingItems.map((item) => item.product).filter(Boolean);
      const positions = rankingItems.reduce((acc, item) => {
        if (item.product?.id) {
          acc[item.product.id] = item.position;
        }

        return acc;
      }, {});

      setRankingId(String(ranking.id));
      setTitle(ranking.title || '');
      setSlug(ranking.slug || '');
      setCategoryId(ranking.categoryId ? String(ranking.categoryId) : '');
      setSubCategoryId(ranking.subCategoryId ? String(ranking.subCategoryId) : '');
      setSelectedProductIds(rankingProducts.map((product) => product.id));
      setProductPositions(positions);
      setProducts((currentProducts) => mergeProducts(currentProducts, rankingProducts));
      setSuccessMessage(`Ranking ${ranking.id} carregado para edicao.`);
    } catch (error) {
      setErrorMessage('Nao foi possivel carregar o ranking informado.');
    } finally {
      setIsLoadingRanking(false);
    }
  };

  const handleNewRanking = () => {
    resetFeedback();
    setRankingId('');
    setTitle('');
    setSlug('');
    setCategoryId('');
    setSubCategoryId('');
    setSelectedProductIds([]);
    setProductPositions({});
    setSuccessMessage('Formulario pronto para criar um novo ranking.');
  };

  const handleToggleProduct = (product) => {
    setSelectedProductIds((currentProductIds) => {
      if (currentProductIds.includes(product.id)) {
        setProductPositions((currentPositions) => {
          const nextPositions = { ...currentPositions };
          delete nextPositions[product.id];

          return nextPositions;
        });

        return currentProductIds.filter((id) => id !== product.id);
      }

      setProductPositions((currentPositions) => ({
        ...currentPositions,
        [product.id]: currentProductIds.length + 1,
      }));

      return [...currentProductIds, product.id];
    });
  };

  const handlePositionChange = (productId, value) => {
    setProductPositions((currentPositions) => ({
      ...currentPositions,
      [productId]: value,
    }));
  };

  const handleSaveRanking = async () => {
    resetFeedback();

    const parsedCategoryId = normalizeId(categoryId);
    const parsedSubCategoryId = normalizeId(subCategoryId);

    if (!title.trim()) {
      setErrorMessage('Informe o titulo do ranking.');
      return;
    }

    if (!slug.trim()) {
      setErrorMessage('Informe o slug do ranking.');
      return;
    }

    if (!parsedCategoryId || !parsedSubCategoryId) {
      setErrorMessage('Informe categoryId e subCategoryId validos.');
      return;
    }

    if (!selectedProductIds.length) {
      setErrorMessage('Selecione pelo menos um produto.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        categoryId: parsedCategoryId,
        subCategoryId: parsedSubCategoryId,
        products: getRankingItemsPayload(selectedProductIds, productPositions),
      };
      const response = rankingId
        ? await put(`${RANKINGS_ENDPOINT}/${rankingId}`, payload)
        : await post(RANKINGS_ENDPOINT, payload);
      const savedRanking = response.data?.ranking;

      if (savedRanking?.id) {
        setRankingId(String(savedRanking.id));
      }

      setSuccessMessage('Ranking salvo com sucesso.');
      await loadRankings();
    } catch (error) {
      setErrorMessage(error.message || 'Nao foi possivel salvar o ranking.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Main labelledBy="ranking-builder-title">
      <Box padding={8}>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <Flex direction="column" alignItems="flex-start" gap={2}>
            <Typography variant="alpha" id="ranking-builder-title">
              Ranking Builder
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Monte rankings editoriais com produtos importados, sem gerar paginas ou publicar conteudo.
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
                  <Typography variant="beta">Dados do ranking</Typography>
                  <Button type="button" variant="secondary" onClick={handleNewRanking}>
                    Novo ranking
                  </Button>
                </Flex>

                <TextInput
                  label="Ranking ID"
                  name="rankingId"
                  value={rankingId}
                  onChange={(event) => setRankingId(event.target.value)}
                  placeholder="Preenchido ao carregar ou salvar"
                />

                <TextInput
                  label="Titulo"
                  name="title"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Top 10 Serras Marmore"
                />

                <TextInput
                  label="Slug"
                  name="slug"
                  value={slug}
                  onChange={(event) => setSlug(slugify(event.target.value))}
                  placeholder="top-10-serras-marmore"
                />

                <Flex gap={4} alignItems="flex-start" wrap="wrap">
                  <Box flex="1 1 160px">
                    <TextInput
                      label="categoryId"
                      name="categoryId"
                      type="number"
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                      placeholder="1"
                    />
                  </Box>
                  <Box flex="1 1 160px">
                    <TextInput
                      label="subCategoryId"
                      name="subCategoryId"
                      type="number"
                      value={subCategoryId}
                      onChange={(event) => setSubCategoryId(event.target.value)}
                      placeholder="1"
                    />
                  </Box>
                </Flex>

                <Flex gap={3} wrap="wrap">
                  <Button
                    type="button"
                    onClick={handleLoadProducts}
                    loading={isLoadingProducts}
                    disabled={isSaving}
                  >
                    Carregar produtos
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleLoadRanking(rankingId)}
                    loading={isLoadingRanking}
                    disabled={!normalizeId(rankingId) || isSaving}
                  >
                    Carregar ranking
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveRanking}
                    loading={isSaving}
                    disabled={isLoadingProducts || isLoadingRanking}
                  >
                    Salvar ranking
                  </Button>
                </Flex>
              </Flex>
            </Box>

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
                    <Typography variant="beta">Rankings existentes</Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {rankings.length} ranking(s) encontrado(s)
                    </Typography>
                  </Flex>
                  <Button type="button" variant="secondary" onClick={loadRankings}>
                    Atualizar
                  </Button>
                </Flex>

                {isLoadingRankings ? (
                  <Flex justifyContent="center" padding={6}>
                    <Loader>Carregando rankings</Loader>
                  </Flex>
                ) : null}

                {!isLoadingRankings && !rankings.length ? (
                  <Box padding={5} background="neutral100" hasRadius>
                    <Typography textColor="neutral600">Nenhum ranking criado ainda.</Typography>
                  </Box>
                ) : null}

                {!isLoadingRankings && rankings.length ? (
                  <Flex direction="column" alignItems="stretch" gap={3}>
                    {rankings.map((ranking) => (
                      <Box key={ranking.id} padding={4} background="neutral100" hasRadius>
                        <Flex justifyContent="space-between" alignItems="center" gap={4}>
                          <Flex direction="column" alignItems="flex-start" gap={1}>
                            <Typography variant="omega" fontWeight="bold">
                              {ranking.title}
                            </Typography>
                            <Typography variant="pi" textColor="neutral600">
                              ID {ranking.id} | {ranking.items?.length || 0} item(s)
                            </Typography>
                          </Flex>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleLoadRanking(ranking.id)}
                            loading={isLoadingRanking}
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
          </Flex>

          <Box
            background="neutral0"
            borderColor="neutral150"
            hasRadius
            padding={6}
            shadow="filterShadow"
          >
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Flex direction="column" alignItems="flex-start" gap={1}>
                <Typography variant="beta">Produtos</Typography>
                <Typography variant="pi" textColor="neutral600">
                  {products.length} produto(s) carregado(s), {selectedProducts.length} selecionado(s)
                </Typography>
              </Flex>

              {isLoadingProducts ? (
                <Flex justifyContent="center" padding={8}>
                  <Loader>Carregando produtos</Loader>
                </Flex>
              ) : null}

              {!isLoadingProducts && !products.length ? (
                <Box padding={6} background="neutral100" hasRadius>
                  <Typography textColor="neutral600">
                    Informe categoryId/subCategoryId e carregue os produtos disponiveis para ranking.
                  </Typography>
                </Box>
              ) : null}

              {!isLoadingProducts && products.length ? (
                <Flex direction="column" alignItems="stretch" gap={3}>
                  {products.map((product) => {
                    const isSelected = selectedProductIds.includes(product.id);

                    return (
                      <Box
                        key={product.id}
                        padding={4}
                        background={isSelected ? 'primary100' : 'neutral100'}
                        borderColor={isSelected ? 'primary500' : 'neutral150'}
                        hasRadius
                      >
                        <Flex alignItems="flex-start" gap={4} wrap="wrap">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleProduct(product)}
                            aria-label={`Selecionar ${product.name}`}
                          />
                          <Box flex="1 1 360px">
                            <Flex direction="column" alignItems="flex-start" gap={1}>
                              <Typography variant="omega" fontWeight="bold">
                                {product.name}
                              </Typography>
                              <Typography variant="pi" textColor="neutral700">
                                {formatPrice(product)}
                                {product.brand ? ` | Marca: ${product.brand}` : ''}
                                {product.availability ? ` | ${product.availability}` : ''}
                              </Typography>
                              <Typography variant="pi" textColor="neutral600">
                                Produto ID {product.id} | Status {product.status || 'nao informado'}
                              </Typography>
                            </Flex>
                          </Box>
                          {isSelected ? (
                            <Box width="140px">
                              <TextInput
                                label="Posicao"
                                name={`position-${product.id}`}
                                type="number"
                                min="1"
                                value={productPositions[product.id] || ''}
                                onChange={(event) =>
                                  handlePositionChange(product.id, event.target.value)
                                }
                              />
                            </Box>
                          ) : null}
                        </Flex>
                      </Box>
                    );
                  })}
                </Flex>
              ) : null}
            </Flex>
          </Box>
        </Flex>
      </Box>
    </Main>
  );
};

export default RankingBuilderPage;
