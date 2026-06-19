'use strict';

const {
  normalizeIntent,
  normalizeKeyText,
} = require('../editorial-intelligence/editorial-key');

const normalizeModifier = (value = '') => normalizeKeyText(value);

const inferModifierFromKeyword = (keyword = '') => {
  const normalizedKeyword = normalizeKeyText(keyword);
  const match = normalizedKeyword.match(/\bpara\s+(.+)$/);

  return match?.[1]?.trim() || null;
};

const getUseCaseProfile = (modifier = '') => {
  const normalizedModifier = normalizeModifier(modifier);

  if (/estudar|estudo|estudante|faculdade|escola/.test(normalizedModifier)) {
    return {
      label: 'estudar',
      rules: [
        'Priorizar produtos portateis e faceis de transportar',
        'Priorizar preco acessivel e boa autonomia de bateria',
        'Priorizar configuracoes suficientes para estudo e produtividade',
        'Evitar desempenho premium sem beneficio claro para estudantes',
      ],
      requiredSignals: ['price', 'weight', 'battery', 'rating', 'availability'],
    };
  }

  if (/trabalhar|trabalho|home office|profissional/.test(normalizedModifier)) {
    return {
      label: 'trabalhar',
      rules: [
        'Priorizar memoria RAM adequada para multitarefa',
        'Priorizar armazenamento SSD e processador equilibrado',
        'Priorizar disponibilidade e confiabilidade para uso diario',
        'Evitar configuracoes basicas que limitem produtividade',
      ],
      requiredSignals: ['ram', 'storage', 'processor', 'rating', 'availability'],
    };
  }

  if (/gamer|jogar|jogos|gaming/.test(normalizedModifier)) {
    return {
      label: 'gamer',
      rules: [
        'Priorizar GPU dedicada ou capacidade grafica comprovada',
        'Priorizar memoria RAM e desempenho sustentado',
        'Priorizar variedade de faixas de desempenho e preco',
        'Evitar modelos de uso basico sem sinal claro de desempenho em jogos',
      ],
      requiredSignals: ['gpu', 'ram', 'processor', 'price', 'rating'],
    };
  }

  if (/cozinha|cozinhar|culinaria/.test(normalizedModifier)) {
    return {
      label: 'cozinha',
      rules: [
        'Priorizar potencia adequada ao tipo de preparo',
        'Priorizar capacidade compativel com o uso proposto',
        'Priorizar facilidade de limpeza e operacao',
        'Evitar produtos sem informacoes de capacidade ou potencia',
      ],
      requiredSignals: ['power', 'capacity', 'cleaning', 'price', 'rating'],
    };
  }

  return {
    label: normalizedModifier || 'uso especifico',
    rules: [
      `Priorizar produtos com atributos diretamente relacionados a ${normalizedModifier || 'este uso'}`,
      'Priorizar variedade suficiente para comparar alternativas reais',
      'Priorizar disponibilidade, avaliacao e preco coerente',
      'Evitar produtos genericos sem aderencia demonstravel ao uso',
    ],
    requiredSignals: ['attributes', 'price', 'rating', 'availability'],
  };
};

const buildBestPlan = () => ({
  strategy: 'best',
  productSelectionRules: [
    'Priorizar popularidade e posicao no ranking do marketplace',
    'Priorizar produtos disponiveis e com boa avaliacao quando houver dados',
    'Considerar preco razoavel sem transformar a pagina em custo-beneficio',
    'Evitar produtos indisponiveis ou sem sinais minimos de confiabilidade',
  ],
  rankingDifferentiation: 'Esta pagina deve equilibrar popularidade, disponibilidade e qualidade geral.',
  duplicationRisk: 'high',
  requiredSignals: ['position', 'availability', 'rating', 'price', 'reviewCount'],
});

const buildCostBenefitPlan = () => ({
  strategy: 'cost-benefit',
  productSelectionRules: [
    'Priorizar produtos com preco abaixo da mediana',
    'Priorizar produtos com boa avaliacao quando disponivel',
    'Priorizar produtos com desconto ou preco antigo quando disponivel',
    'Evitar produtos premium sem justificativa',
  ],
  rankingDifferentiation: 'Esta pagina deve destacar custo-beneficio, nao apenas mais vendidos.',
  duplicationRisk: 'medium',
  requiredSignals: ['price', 'rating', 'oldPrice', 'reviewCount'],
});

const buildComparisonPlan = () => ({
  strategy: 'comparison',
  productSelectionRules: [
    'Selecionar marcas, modelos ou tipos comparaveis',
    'Exigir variedade real de atributos e faixas de preco',
    'Destacar diferencas objetivas entre as alternativas',
    'Evitar uma lista dominada por variantes quase identicas',
  ],
  rankingDifferentiation: 'Esta pagina deve comparar alternativas distintas e explicar para quem cada uma serve.',
  duplicationRisk: 'low',
  requiredSignals: ['brand', 'model', 'attributes', 'price', 'rating'],
});

const buildBuyingGuidePlan = () => ({
  strategy: 'buying-guide',
  productSelectionRules: [
    'Usar uma lista ampla o suficiente para ilustrar os criterios de compra',
    'Representar diferentes perfis de uso e faixas de preco',
    'Priorizar produtos com atributos completos e comparaveis',
    'Evitar tratar popularidade como unico criterio de escolha',
  ],
  rankingDifferentiation: 'Esta pagina deve ensinar criterios de escolha e usar produtos como exemplos praticos.',
  duplicationRisk: 'medium',
  requiredSignals: ['attributes', 'price', 'brand', 'rating', 'availability'],
});

const buildUseCasePlan = ({ modifier }) => {
  const profile = getUseCaseProfile(modifier);

  return {
    strategy: `use-case:${profile.label}`,
    productSelectionRules: profile.rules,
    rankingDifferentiation: `Esta pagina deve selecionar produtos adequados para ${profile.label}, nao repetir a lista generica do cluster.`,
    duplicationRisk: modifier ? 'low' : 'high',
    requiredSignals: profile.requiredSignals,
  };
};

const buildIntentProductSelectionPlan = ({
  intent,
  keyword,
  clusterKey,
  intentModifier,
} = {}) => {
  const normalizedIntent = normalizeIntent(intent);
  const modifier = normalizeModifier(intentModifier) || inferModifierFromKeyword(keyword);
  let plan;

  if (normalizedIntent === 'costBenefit') {
    plan = buildCostBenefitPlan();
  } else if (normalizedIntent === 'comparison') {
    plan = buildComparisonPlan();
  } else if (normalizedIntent === 'buyingGuide') {
    plan = buildBuyingGuidePlan();
  } else if (normalizedIntent === 'useCase') {
    plan = buildUseCasePlan({ modifier });
  } else {
    plan = buildBestPlan();
  }

  return {
    ...plan,
    intent: normalizedIntent,
    intentModifier: modifier || null,
    keyword: keyword || null,
    clusterKey: clusterKey || null,
  };
};

module.exports = {
  buildIntentProductSelectionPlan,
};
