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

const RANKING_CHAT_ENDPOINT = '/ranking-generator/generate';
const RANKING_CHAT_PREVIEW_ENDPOINT = '/ranking-generator/preview';
const EXAMPLE_TERMS = ['furadeira', 'notebook', 'mamadeira', 'air fryer'];
const PRODUCT_COUNT_OPTIONS = [5, 10, 15, 20];
const INTENT_OPTIONS = [
  { value: 'best', label: 'Melhores' },
  { value: 'costBenefit', label: 'Custo-beneficio' },
  { value: 'comparison', label: 'Comparativo' },
  { value: 'buyingGuide', label: 'Guia de compra' },
];
const PAGE_REUSE_ACTIONS = [
  { value: 'reuse-existing', label: 'Reutilizar pagina existente' },
  { value: 'create-new-version', label: 'Criar nova versao' },
];

const formatPercent = (value) => {
  const numberValue = Number(value || 0);

  return `${Math.round(numberValue * 100)}%`;
};

const formatList = (items = []) => {
  return items.map((item) => item.message || item.code || item.key || String(item)).join(', ');
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

const clampProductCount = (value) => {
  const numberValue = Number(value) || 10;
  const closest = PRODUCT_COUNT_OPTIONS.reduce((selected, option) => {
    return Math.abs(option - numberValue) < Math.abs(selected - numberValue) ? option : selected;
  }, 10);

  return closest;
};

const getPreviewData = (preview) => {
  const commandContext = preview?.commandContext || {};
  const editorialPlan = preview?.editorialPlan || {};
  const marketplaceCategory = preview?.category?.marketplace || {};
  const localCategory = preview?.category?.local?.category || {};
  const localSubCategory = preview?.category?.local?.subCategory || {};

  return {
    commandContext,
    editorialPlan,
    marketplaceCategory,
    localCategory,
    localSubCategory,
  };
};

const buildEditablePlan = (preview) => {
  if (!preview) {
    return null;
  }

  const { commandContext, editorialPlan } = getPreviewData(preview);
  const pageReuse = preview.pageReuse || {};

  return {
    term: commandContext.term || editorialPlan.term || '',
    title: editorialPlan.titleHint || commandContext.titleHint || '',
    slug: editorialPlan.slugHint || commandContext.preferredSlug || '',
    productCount: clampProductCount(
      editorialPlan.productCount || commandContext.productCount || commandContext.displayLimit || 10
    ),
    intent: editorialPlan.intent || commandContext.editorialIntent || 'best',
    pageAction: pageReuse.found ? 'reuse-existing' : 'create-new-version',
  };
};

const removeAccents = (value = '') => {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const clientSlugify = (value = '') => {
  return removeAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
};

const pluralizePlanTerm = (term = '') => {
  const normalizedTerm = term.trim().toLowerCase();

  if (normalizedTerm === 'pc gamer') {
    return 'pcs gamer';
  }

  if (normalizedTerm === 'cadeira gamer') {
    return 'cadeiras gamer';
  }

  if (normalizedTerm.endsWith('air fryer')) {
    return normalizedTerm.replace(/air fryer$/, 'air fryers');
  }

  const words = normalizedTerm.split(/\s+/).filter(Boolean);
  const lastWord = words[words.length - 1] || '';

  if (!lastWord || lastWord.endsWith('s') || words.some((word, index) => index < words.length - 1 && word.endsWith('s'))) {
    return normalizedTerm;
  }

  if (lastWord === 'gamer' && words.length > 1) {
    const previousWord = words[words.length - 2];
    words[words.length - 2] = previousWord.endsWith('r') ? `${previousWord}es` : `${previousWord}s`;

    return words.join(' ');
  }

  words[words.length - 1] = lastWord.endsWith('r') ? `${lastWord}es` : `${lastWord}s`;

  return words.join(' ');
};

const formatTitleTerm = (term = '') => {
  return term
    .replace(/\bpcs gamer\b/g, 'PCs gamer')
    .replace(/\bpc gamer\b/g, 'PC gamer');
};

const getArticle = (term = '') => {
  const normalizedTerm = term.toLowerCase();

  return normalizedTerm.startsWith('cadeira') ||
    normalizedTerm.startsWith('cadeiras') ||
    normalizedTerm.startsWith('furadeira') ||
    normalizedTerm.startsWith('furadeiras') ||
    normalizedTerm.startsWith('mamadeira') ||
    normalizedTerm.startsWith('mamadeiras') ||
    normalizedTerm.startsWith('cafeteira') ||
    normalizedTerm.startsWith('cafeteiras') ||
    normalizedTerm.startsWith('batedeira') ||
    normalizedTerm.startsWith('batedeiras')
    ? 'As'
    : 'Os';
};

const buildPlanTitle = ({ term, productCount, intent }) => {
  const pluralTerm = formatTitleTerm(pluralizePlanTerm(term));

  if (intent === 'costBenefit') {
    return `Melhores ${pluralTerm} custo-benefício`;
  }

  if (intent === 'comparison') {
    return `Comparativo de ${pluralTerm}: veja qual escolher`;
  }

  if (intent === 'buyingGuide') {
    return `Guia de compra: como escolher ${pluralTerm}`;
  }

  return `${getArticle(pluralTerm)} ${productCount} melhores ${pluralTerm} para comprar`;
};

const buildPlanSlug = ({ term, intent }) => {
  const pluralTerm = pluralizePlanTerm(term);

  if (intent === 'costBenefit') {
    return clientSlugify(`${pluralTerm} custo beneficio`);
  }

  if (intent === 'comparison') {
    return clientSlugify(`comparativo ${pluralTerm}`);
  }

  if (intent === 'buyingGuide') {
    return clientSlugify(`guia ${term}`);
  }

  return clientSlugify(`melhores ${pluralTerm}`);
};

const getPlanChanges = (initialPlan, plan) => {
  if (!initialPlan || !plan) {
    return [];
  }

  return [
    initialPlan.title !== plan.title ? 'Titulo alterado' : null,
    initialPlan.slug !== plan.slug ? 'Slug alterado' : null,
    initialPlan.productCount !== plan.productCount ? 'Quantidade alterada' : null,
    initialPlan.intent !== plan.intent ? 'Intencao alterada' : null,
  ].filter(Boolean);
};

const getEditorialTemplateForIntent = (intent) => {
  if (intent === 'costBenefit') {
    return 'cost-benefit';
  }

  if (intent === 'comparison') {
    return 'comparison';
  }

  if (intent === 'buyingGuide') {
    return 'buying-guide';
  }

  return 'top-list';
};

const isCategoryUnsafe = (preview) => {
  return Boolean(preview?.requiresCategoryReview || preview?.category?.requiresCategoryReview);
};

const getCategoryLabel = (preview) => {
  const { localCategory, localSubCategory, marketplaceCategory } = getPreviewData(preview);

  if (localCategory.name && localSubCategory.name) {
    return `${localCategory.name} > ${localSubCategory.name}`;
  }

  return localCategory.name || marketplaceCategory.name || 'Categoria ainda nao detectada';
};

const getGooglePath = (preview, plan) => {
  const { localCategory } = getPreviewData(preview);
  const categorySlug = localCategory.slug || 'ranking';
  const slug = plan?.slug || 'slug-da-pagina';

  return `www.site.com/${categorySlug}/${slug}`;
};

const buildMetaDescription = (plan) => {
  const quantity = plan?.productCount || 10;
  const term = plan?.term || 'produtos';

  if (plan?.intent === 'costBenefit') {
    return `Compare ${quantity} opcoes de ${term} custo-beneficio e entenda qual compra faz mais sentido para o seu perfil.`;
  }

  if (plan?.intent === 'comparison') {
    return `Compare ${quantity} opcoes de ${term}, veja diferencas importantes e escolha com mais seguranca.`;
  }

  if (plan?.intent === 'buyingGuide') {
    return `Veja como escolher ${term}, quais pontos avaliar e quais opcoes considerar antes de comprar.`;
  }

  return `Compare as melhores opcoes de ${term}, veja vantagens, diferencas e descubra qual vale mais a pena para o seu perfil.`;
};

const buildPreviewAssistantText = (preview, plan) => {
  if (!preview || !plan) {
    return 'Entendi. Gere o preview para eu montar o plano editorial.';
  }

  const pageReuse = preview.pageReuse || {};
  const lines = [
    'Entendi.',
    '',
    `Categoria detectada: ${getCategoryLabel(preview)}`,
    `Titulo sugerido: ${plan.title || 'n/a'}`,
    `Slug: ${plan.slug || 'n/a'}`,
  ];

  if (pageReuse.found) {
    lines.push('', 'Pagina existente encontrada.');
    lines.push('Deseja reutilizar a pagina existente ou criar uma nova versao?');
  } else {
    lines.push('', 'Nenhuma pagina editorial equivalente foi encontrada.');
  }

  return lines.join('\n');
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

const SegmentedControl = ({ label, options, value, onChange }) => {
  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="sigma" textColor="neutral600">
        {label}
      </Typography>
      <Flex gap={2} wrap="wrap">
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <Button
              key={option.value}
              type="button"
              size="S"
              variant={isSelected ? 'default' : 'tertiary'}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </Flex>
    </Flex>
  );
};

const ProductCountControl = ({ value, onChange }) => {
  const currentIndex = PRODUCT_COUNT_OPTIONS.indexOf(value);
  const canDecrease = currentIndex > 0;
  const canIncrease = currentIndex < PRODUCT_COUNT_OPTIONS.length - 1;

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="sigma" textColor="neutral600">
        Quantidade
      </Typography>
      <Flex alignItems="center" gap={2}>
        <Button
          type="button"
          size="S"
          variant="tertiary"
          disabled={!canDecrease}
          onClick={() => onChange(PRODUCT_COUNT_OPTIONS[currentIndex - 1])}
        >
          -
        </Button>
        <Box
          background="neutral100"
          borderColor="neutral200"
          hasRadius
          paddingBottom={2}
          paddingLeft={5}
          paddingRight={5}
          paddingTop={2}
        >
          <Typography fontWeight="bold">{value}</Typography>
        </Box>
        <Button
          type="button"
          size="S"
          variant="tertiary"
          disabled={!canIncrease}
          onClick={() => onChange(PRODUCT_COUNT_OPTIONS[currentIndex + 1])}
        >
          +
        </Button>
      </Flex>
    </Flex>
  );
};

const EditorialPlanCard = ({
  preview,
  plan,
  planChanges,
  onPlanChange,
  onRefreshPreview,
  onGenerate,
  isPreviewing,
  isRunning,
}) => {
  if (!preview || !plan) {
    return null;
  }

  const pageReuse = preview.pageReuse || {};
  const categoryUnsafe = isCategoryUnsafe(preview);

  return (
    <Box background="neutral0" borderColor="primary200" hasRadius padding={5}>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography variant="beta">Plano editorial</Typography>
            <Typography textColor="neutral600">{plan.term || 'Termo nao identificado'}</Typography>
          </Flex>
          <Badge active={pageReuse.found}>{pageReuse.found ? 'Pagina existente encontrada' : 'Nova pagina'}</Badge>
        </Flex>

        <Flex gap={4} wrap="wrap">
          <Box flex="1 1 220px">
            <TextInput
              label="Termo"
              name="editorial-term"
              value={plan.term}
              onChange={(event) => onPlanChange({ term: event.target.value })}
            />
          </Box>
          <Box flex="2 1 420px">
            <TextInput
              label="Titulo"
              name="editorial-title"
              value={plan.title}
              onChange={(event) => onPlanChange({ title: event.target.value })}
            />
          </Box>
          <Box flex="1 1 260px">
            <TextInput
              label="Slug"
              name="editorial-slug"
              value={plan.slug}
              onChange={(event) => onPlanChange({ slug: event.target.value })}
            />
          </Box>
        </Flex>

        <Flex gap={5} alignItems="flex-start" wrap="wrap">
          <ProductCountControl
            value={plan.productCount}
            onChange={(productCount) => onPlanChange({ productCount })}
          />
          <Box flex="1 1 420px">
            <SegmentedControl
              label="Intencao"
              options={INTENT_OPTIONS}
              value={plan.intent}
              onChange={(intent) => onPlanChange({ intent })}
            />
          </Box>
        </Flex>

        {planChanges.length ? (
          <Box background="primary100" borderColor="primary200" hasRadius padding={4}>
            <Flex direction="column" alignItems="stretch" gap={2}>
              <Typography fontWeight="bold">Plano personalizado</Typography>
              {planChanges.map((change) => (
                <Typography key={change} textColor="primary700">
                  ✓ {change}
                </Typography>
              ))}
            </Flex>
          </Box>
        ) : null}

        <Box background="neutral100" borderColor="neutral150" hasRadius padding={4}>
          <Flex direction="column" alignItems="stretch" gap={2}>
            <Typography variant="sigma" textColor="neutral600">
              Categoria
            </Typography>
            <Typography>{getCategoryLabel(preview)}</Typography>
          </Flex>
        </Box>

        {categoryUnsafe ? (
          <Alert closeLabel="Fechar aviso de categoria" title="Categoria insegura" variant="danger">
            A categoria encontrada parece nao corresponder ao produto. Ajuste o termo ou escolha outra categoria.
          </Alert>
        ) : null}

        <Box
          background={pageReuse.found ? 'warning100' : 'success100'}
          borderColor={pageReuse.found ? 'warning200' : 'success200'}
          hasRadius
          padding={4}
        >
          <Flex direction="column" alignItems="stretch" gap={3}>
            <Typography variant="sigma" textColor="neutral600">
              Pagina existente
            </Typography>
            <Typography>{pageReuse.found ? getPageReuseLabel(pageReuse) : 'Nenhuma pagina equivalente encontrada.'}</Typography>

            {pageReuse.found ? (
              <SegmentedControl
                label="Acao"
                options={PAGE_REUSE_ACTIONS}
                value={plan.pageAction}
                onChange={(pageAction) => onPlanChange({ pageAction })}
              />
            ) : null}
          </Flex>
        </Box>

        {plan.pageAction === 'create-new-version' && pageReuse.found ? (
          <Alert closeLabel="Fechar aviso" title="Acao ainda nao conectada" variant="warning">
            Esta selecao altera apenas o preview nesta fase. A geracao continua respeitando a protecao atual de reuso.
          </Alert>
        ) : null}

        <Flex justifyContent="flex-end" gap={3} wrap="wrap">
          <Button type="button" variant="secondary" loading={isPreviewing} disabled={isRunning} onClick={onRefreshPreview}>
            Atualizar Preview
          </Button>
          <Button type="button" loading={isRunning} disabled={isPreviewing || categoryUnsafe} onClick={onGenerate}>
            Gerar Ranking
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};

const GooglePreview = ({ preview, plan }) => {
  if (!preview || !plan) {
    return null;
  }

  return (
    <Box background="neutral0" borderColor="neutral150" hasRadius padding={5}>
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Typography variant="beta">Preview Google</Typography>
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography textColor="primary600" fontWeight="bold">
            {plan.title || 'Titulo da pagina'}
          </Typography>
          <Typography textColor="success600">{getGooglePath(preview, plan)}</Typography>
          <Typography textColor="neutral700">{buildMetaDescription(plan)}</Typography>
        </Flex>
      </Flex>
    </Box>
  );
};

const ExecutionPreview = ({ preview, plan, autoPublish }) => {
  if (!preview || !plan) {
    return null;
  }

  const pageReuse = preview.pageReuse || {};
  const shouldReuse = pageReuse.found && plan.pageAction === 'reuse-existing';
  const steps = shouldReuse
    ? [
        'Reutilizar pagina existente',
        'Nao executar IA',
        'Nao gerar nova pagina',
        'Manter publicacao atual',
      ]
    : [
        'Resolver categoria Mercado Livre',
        `Buscar ate ${preview.commandContext?.fetchLimit || 20} produtos`,
        `Exibir ${plan.productCount} produtos no ranking`,
        'Gerar SEO',
        'Gerar FAQ',
        autoPublish ? 'Publicar pagina' : 'Enviar pagina para revisao',
      ];

  return (
    <Box background="neutral0" borderColor="neutral150" hasRadius padding={5}>
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Typography variant="beta">O que vai acontecer</Typography>
        <Flex direction="column" alignItems="stretch" gap={2}>
          {steps.map((step) => (
            <Flex key={step} gap={2} alignItems="center">
              <Typography textColor="success600" fontWeight="bold">
                ✓
              </Typography>
              <Typography>{step}</Typography>
            </Flex>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
};

const TechnicalDetails = ({ preview }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!preview) {
    return null;
  }

  const { marketplaceCategory, localCategory, localSubCategory } = getPreviewData(preview);
  const diagnostics = {
    marketplaceCategoryId: marketplaceCategory.id || null,
    localCategoryId: localCategory.id || null,
    localSubCategoryId: localSubCategory.id || null,
    publishableRate: preview.marketplaceRanking?.publishableRate ?? null,
    categoryConfidence: preview.categoryConfidence || preview.category?.categoryConfidence || null,
    requiresCategoryReview: isCategoryUnsafe(preview),
    categoryReviewReason: preview.category?.reviewReason || null,
    rankingId: preview.rankingId || preview.ranking?.id || null,
    pageId: preview.pageReuse?.pageId || preview.pageId || null,
    pageReuse: preview.pageReuse || null,
    warnings: preview.warnings || preview.category?.warnings || [],
    diagnostics: preview.diagnostics || null,
  };

  return (
    <Box background="neutral0" borderColor="neutral150" hasRadius padding={4}>
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Button type="button" variant="tertiary" onClick={() => setIsOpen((value) => !value)}>
          {isOpen ? 'Ocultar detalhes tecnicos' : 'Mostrar detalhes tecnicos'}
        </Button>

        {isOpen ? (
          <Box background="neutral100" hasRadius padding={4}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </Box>
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
          <Typography style={{ whiteSpace: 'pre-line' }}>{message.text}</Typography>
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
  const [editablePlan, setEditablePlan] = useState(null);
  const [initialPlan, setInitialPlan] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'system',
      text: 'Me diga o ranking que voce quer criar. Eu preparo um plano editorial antes de executar.',
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
      const preview = response.data;
      const nextPlan = buildEditablePlan(preview);

      setPreviewResult(preview);
      setEditablePlan(nextPlan);
      setInitialPlan(nextPlan);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `${Date.now()}-operator-preview`,
          role: 'operator',
          text: normalizedTerm,
        },
        {
          id: `${Date.now()}-system-preview`,
          role: 'system',
          text: buildPreviewAssistantText(preview, nextPlan),
        },
      ]);
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

    if (isCategoryUnsafe(previewResult)) {
      setErrorMessage('A categoria encontrada parece nao corresponder ao produto. Ajuste o termo antes de gerar.');
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
        term: editablePlan?.term,
        titleHint: editablePlan?.title,
        preferredSlug: editablePlan?.slug,
        displayLimit: editablePlan?.productCount,
        editorialIntent: editablePlan?.intent,
        editorialTemplate: getEditorialTemplateForIntent(editablePlan?.intent),
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

  const updateEditablePlan = (patch) => {
    setEditablePlan((currentPlan) => {
      const nextPlan = {
        ...currentPlan,
        ...patch,
      };

      if (Object.prototype.hasOwnProperty.call(patch, 'intent')) {
        nextPlan.title = buildPlanTitle(nextPlan);
        nextPlan.slug = buildPlanSlug(nextPlan);
      }

      if (Object.prototype.hasOwnProperty.call(patch, 'productCount')) {
        nextPlan.title = buildPlanTitle(nextPlan);
      }

      return nextPlan;
    });
  };

  const getCurrentMessage = () => {
    return term || previewResult?.commandContext?.rawMessage || previewResult?.commandContext?.term || '';
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
              Assistente editorial para preview, reuso e publicacao controlada.
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
                <Flex direction="column" alignItems="stretch" gap={4}>
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </Flex>

                <Flex gap={4} alignItems="flex-end" wrap="wrap">
                  <Box flex="1 1 320px">
                    <TextInput
                      label="Mensagem"
                      name="term"
                      value={term}
                      onChange={(event) => {
                        setTerm(event.target.value);
                        setPreviewResult(null);
                        setEditablePlan(null);
                        setInitialPlan(null);
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
                    disabled={isPreviewing || isCategoryUnsafe(previewResult)}
                    onClick={() => runTerm(getCurrentMessage())}
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
                        setEditablePlan(null);
                        setInitialPlan(null);
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

          <EditorialPlanCard
            preview={previewResult}
            plan={editablePlan}
            planChanges={getPlanChanges(initialPlan, editablePlan)}
            onPlanChange={updateEditablePlan}
            onRefreshPreview={() => runPreview(getCurrentMessage())}
            onGenerate={() => runTerm(getCurrentMessage())}
            isPreviewing={isPreviewing}
            isRunning={isRunning}
          />

          <Flex alignItems="stretch" gap={4} wrap="wrap">
            <Box flex="1 1 360px">
              <GooglePreview preview={previewResult} plan={editablePlan} />
            </Box>
            <Box flex="1 1 360px">
              <ExecutionPreview preview={previewResult} plan={editablePlan} autoPublish={autoPublish} />
            </Box>
          </Flex>

          <TechnicalDetails preview={previewResult} />

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
