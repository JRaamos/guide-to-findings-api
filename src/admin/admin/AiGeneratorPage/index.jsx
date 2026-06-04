import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Flex,
  Main,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

const GENERATE_ENDPOINT = '/api/internal/ai-generator/generate-page';

const AiGeneratorPage = () => {
  const { post } = useFetchClient();
  const [rankingId, setRankingId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [generationResult, setGenerationResult] = useState(null);

  const resetFeedback = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    resetFeedback();
    setGenerationResult(null);

    const parsedRankingId = Number(rankingId);

    if (!Number.isInteger(parsedRankingId) || parsedRankingId <= 0) {
      setErrorMessage('Informe um rankingId valido.');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await post(GENERATE_ENDPOINT, {
        rankingId: parsedRankingId,
      });

      setGenerationResult(response.data);
      setSuccessMessage(`Conteudo gerado com sucesso para a Page ${response.data?.pageId}.`);
    } catch (error) {
      setErrorMessage('Nao foi possivel gerar o conteudo com IA agora.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Main labelledBy="ai-generator-title">
      <Box padding={8}>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <Flex direction="column" alignItems="flex-start" gap={2}>
            <Typography variant="alpha" id="ai-generator-title">
              AI Generator
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Gere Page draft, Seo draft e Faq draft a partir de um ranking. Nada e publicado
              automaticamente.
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
            <form onSubmit={handleGenerate}>
              <Flex direction="column" alignItems="stretch" gap={4}>
                <TextInput
                  label="rankingId"
                  name="rankingId"
                  type="number"
                  value={rankingId}
                  onChange={(event) => setRankingId(event.target.value)}
                  placeholder="3"
                />

                <Flex justifyContent="flex-start">
                  <Button type="submit" loading={isGenerating}>
                    Gerar conteudo
                  </Button>
                </Flex>
              </Flex>
            </form>
          </Box>

          {generationResult ? (
            <Box
              background="neutral0"
              borderColor="neutral150"
              hasRadius
              padding={6}
              shadow="filterShadow"
            >
              <Flex direction="column" alignItems="stretch" gap={3}>
                <Typography variant="beta">Resultado</Typography>
                <Typography textColor="neutral700">pageId: {generationResult.pageId}</Typography>
                <Typography textColor="neutral700">seoId: {generationResult.seoId}</Typography>
                <Typography textColor="neutral700">
                  faqIds: {(generationResult.faqIds || []).join(', ')}
                </Typography>
                <Typography textColor="neutral700">
                  aiGenerationLogId: {generationResult.aiGenerationLogId}
                </Typography>
              </Flex>
            </Box>
          ) : null}
        </Flex>
      </Box>
    </Main>
  );
};

export default AiGeneratorPage;
