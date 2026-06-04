import React, { useMemo, useState } from 'react';
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

const SEARCH_ENDPOINT = '/api/internal/marketplaces/mercado-livre/search';
const IMPORT_ENDPOINT = '/api/internal/marketplaces/mercado-livre/import';

const normalizeLimit = (value) => {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1) {
    return 10;
  }

  return Math.min(limit, 50);
};

const normalizeId = (value) => {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
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

const getProductKey = (product) => product.marketplaceProductId || product.id || product.title;

const MercadoLivrePage = () => {
  const { post } = useFetchClient();
  const [query, setQuery] = useState('serra marmore');
  const [limit, setLimit] = useState('10');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const selectedProducts = useMemo(() => {
    const selectedSet = new Set(selectedProductIds);

    return products.filter((product) => selectedSet.has(getProductKey(product)));
  }, [products, selectedProductIds]);

  const resetFeedback = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    resetFeedback();

    const searchQuery = query.trim();

    if (!searchQuery) {
      setErrorMessage('Informe um termo para buscar produtos.');
      return;
    }

    setIsSearching(true);
    setProducts([]);
    setSelectedProductIds([]);

    try {
      const response = await post(SEARCH_ENDPOINT, {
        query: searchQuery,
        limit: normalizeLimit(limit),
      });
      const foundProducts = Array.isArray(response.data?.products) ? response.data.products : [];

      setProducts(foundProducts);

      if (!foundProducts.length) {
        setSuccessMessage('Nenhum produto encontrado para a busca informada.');
      }
    } catch (error) {
      setErrorMessage('Nao foi possivel buscar produtos no Mercado Livre agora.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleProduct = (product) => {
    const productKey = getProductKey(product);

    setSelectedProductIds((currentProductIds) => {
      if (currentProductIds.includes(productKey)) {
        return currentProductIds.filter((id) => id !== productKey);
      }

      return [...currentProductIds, productKey];
    });
  };

  const handleImport = async () => {
    resetFeedback();

    const parsedCategoryId = normalizeId(categoryId);
    const parsedSubCategoryId = normalizeId(subCategoryId);

    if (!parsedCategoryId || !parsedSubCategoryId) {
      setErrorMessage('Informe categoryId e subCategoryId validos antes de importar.');
      return;
    }

    if (!selectedProducts.length) {
      setErrorMessage('Selecione pelo menos um produto para importar.');
      return;
    }

    setIsImporting(true);

    try {
      const response = await post(IMPORT_ENDPOINT, {
        categoryId: parsedCategoryId,
        subCategoryId: parsedSubCategoryId,
        products: selectedProducts,
      });
      const importedCount = response.data?.imported ?? selectedProducts.length;

      setSuccessMessage(`Produtos importados com sucesso. Total importado: ${importedCount}.`);
    } catch (error) {
      setErrorMessage('Nao foi possivel importar os produtos selecionados.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Main labelledBy="mercado-livre-title">
      <Box padding={8}>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <Flex direction="column" alignItems="flex-start" gap={2}>
            <Typography variant="alpha" id="mercado-livre-title">
              Mercado Livre
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Busque produtos no backend do Strapi e importe os itens selecionados para o catalogo.
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

          <Box
            background="neutral0"
            borderColor="neutral150"
            hasRadius
            padding={6}
            shadow="filterShadow"
          >
            <form onSubmit={handleSearch}>
              <Flex direction="column" alignItems="stretch" gap={4}>
                <Flex gap={4} alignItems="flex-end" wrap="wrap">
                  <Box flex="1 1 280px">
                    <TextInput
                      label="Termo de busca"
                      name="query"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="serra marmore"
                    />
                  </Box>
                  <Box width="140px">
                    <TextInput
                      label="Limite"
                      name="limit"
                      type="number"
                      value={limit}
                      onChange={(event) => setLimit(event.target.value)}
                      min="1"
                      max="50"
                    />
                  </Box>
                  <Button type="submit" loading={isSearching} disabled={isImporting}>
                    Buscar produtos
                  </Button>
                </Flex>

                <Flex gap={4} alignItems="flex-start" wrap="wrap">
                  <Box flex="1 1 220px">
                    <TextInput
                      label="categoryId interno do Strapi"
                      name="categoryId"
                      type="number"
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                      placeholder="1"
                    />
                  </Box>
                  <Box flex="1 1 220px">
                    <TextInput
                      label="subCategoryId interno do Strapi"
                      name="subCategoryId"
                      type="number"
                      value={subCategoryId}
                      onChange={(event) => setSubCategoryId(event.target.value)}
                      placeholder="1"
                    />
                  </Box>
                </Flex>
              </Flex>
            </form>
          </Box>

          <Box
            background="neutral0"
            borderColor="neutral150"
            hasRadius
            padding={6}
            shadow="filterShadow"
          >
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Flex justifyContent="space-between" alignItems="center" gap={4}>
                <Flex direction="column" alignItems="flex-start" gap={1}>
                  <Typography variant="beta">Resultados</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {products.length} produto(s) encontrado(s), {selectedProducts.length} selecionado(s)
                  </Typography>
                </Flex>
                <Button
                  type="button"
                  onClick={handleImport}
                  loading={isImporting}
                  disabled={isSearching || !selectedProducts.length}
                >
                  Importar selecionados
                </Button>
              </Flex>

              {isSearching ? (
                <Flex justifyContent="center" padding={8}>
                  <Loader>Buscando produtos no Mercado Livre</Loader>
                </Flex>
              ) : null}

              {!isSearching && !products.length ? (
                <Box padding={6} background="neutral100" hasRadius>
                  <Typography textColor="neutral600">
                    Nenhum produto carregado. Faca uma busca para listar resultados normalizados.
                  </Typography>
                </Box>
              ) : null}

              {!isSearching && products.length ? (
                <Flex direction="column" alignItems="stretch" gap={3}>
                  {products.map((product) => {
                    const productKey = getProductKey(product);
                    const isSelected = selectedProductIds.includes(productKey);

                    return (
                      <Box
                        key={productKey}
                        padding={4}
                        background={isSelected ? 'primary100' : 'neutral100'}
                        hasRadius
                        borderColor={isSelected ? 'primary500' : 'neutral150'}
                      >
                        <Flex alignItems="flex-start" gap={4}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleProduct(product)}
                            aria-label={`Selecionar ${product.title || product.marketplaceProductId}`}
                          />
                          <Flex direction="column" alignItems="stretch" gap={2}>
                            <Typography variant="omega" fontWeight="bold">
                              {product.title || 'Produto sem titulo'}
                            </Typography>
                            <Typography variant="pi" textColor="neutral700">
                              {formatPrice(product)}
                              {product.brand ? ` | Marca: ${product.brand}` : ''}
                              {product.model ? ` | Modelo: ${product.model}` : ''}
                            </Typography>
                            <Typography variant="pi" textColor="neutral600">
                              ID Mercado Livre: {product.marketplaceProductId || 'nao informado'}
                            </Typography>
                            {product.permalink ? (
                              <Typography variant="pi" textColor="primary600">
                                {product.permalink}
                              </Typography>
                            ) : null}
                          </Flex>
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

export default MercadoLivrePage;
