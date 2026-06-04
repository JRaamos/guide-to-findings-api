'use strict';

const { createStrapi } = require('@strapi/strapi');

const now = () => new Date().toISOString();

const uid = {
  category: 'api::category.category',
  subCategory: 'api::sub-category.sub-category',
  marketplace: 'api::marketplace.marketplace',
  product: 'api::product.product',
  affiliateLink: 'api::affiliate-link.affiliate-link',
  seo: 'api::seo.seo',
  page: 'api::page.page',
  faq: 'api::faq.faq',
  ranking: 'api::ranking.ranking',
  rankingItem: 'api::ranking-item.ranking-item',
};

const products = [
  {
    name: 'Serra Marmore Bosch GDC 150 1500W',
    slug: 'serra-marmore-bosch-gdc-150-1500w',
    shortDescription: 'Serra marmore robusta para cortes em pisos, pedras e alvenaria leve.',
    price: 389.9,
    oldPrice: 459.9,
    rating: 4.8,
    reviewCount: 1240,
    brand: 'Bosch',
    model: 'GDC 150',
    imageUrl: 'https://placehold.co/600x600/png?text=Serra+Marmore+Bosch',
  },
  {
    name: 'Serra Marmore Makita 4100NH3Z 1450W',
    slug: 'serra-marmore-makita-4100nh3z-1450w',
    shortDescription: 'Modelo equilibrado para uso frequente em reformas e pequenos canteiros.',
    price: 429.9,
    oldPrice: 499.9,
    rating: 4.7,
    reviewCount: 980,
    brand: 'Makita',
    model: '4100NH3Z',
    imageUrl: 'https://placehold.co/600x600/png?text=Serra+Marmore+Makita',
  },
  {
    name: 'Serra Marmore Vonder SMV 1300S 1300W',
    slug: 'serra-marmore-vonder-smv-1300s-1300w',
    shortDescription: 'Opcao de bom custo-beneficio para cortes ocasionais e servicos domesticos.',
    price: 249.9,
    oldPrice: 319.9,
    rating: 4.5,
    reviewCount: 760,
    brand: 'Vonder',
    model: 'SMV 1300S',
    imageUrl: 'https://placehold.co/600x600/png?text=Serra+Marmore+Vonder',
  },
];

const faqs = [
  {
    question: 'Qual a melhor serra marmore para uso em obra?',
    answer:
      '<p>A melhor escolha depende da frequencia de uso, potencia necessaria e tipo de material que sera cortado.</p>',
    order: 1,
  },
  {
    question: 'Serra marmore corta porcelanato?',
    answer:
      '<p>Sim, desde que usada com disco adequado para porcelanato e seguindo as orientacoes de seguranca do fabricante.</p>',
    order: 2,
  },
  {
    question: 'Qual potencia procurar em uma serra marmore?',
    answer:
      '<p>Para uso frequente, modelos entre 1300W e 1500W costumam atender bem reformas, cortes em piso e pequenos servicos.</p>',
    order: 3,
  },
];

const rankingItems = [
  {
    position: 1,
    title: 'Bosch GDC 150 1500W',
    summary: 'Boa escolha geral para quem procura desempenho consistente e marca reconhecida.',
    pros: ['Boa potencia', 'Marca reconhecida', 'Construção robusta'],
    cons: ['Preco acima de modelos de entrada'],
    highlight: 'Melhor escolha geral',
    score: 9.4,
  },
  {
    position: 2,
    title: 'Makita 4100NH3Z 1450W',
    summary: 'Alternativa confiavel para uso frequente em reformas e cortes de acabamento.',
    pros: ['Boa ergonomia', 'Desempenho estavel', 'Rede ampla de assistencia'],
    cons: ['Pode custar mais que opcoes intermediarias'],
    highlight: 'Mais equilibrada',
    score: 9.1,
  },
  {
    position: 3,
    title: 'Vonder SMV 1300S 1300W',
    summary: 'Opcao interessante para quem quer gastar menos em servicos ocasionais.',
    pros: ['Preco competitivo', 'Boa para uso domestico', 'Facil de encontrar'],
    cons: ['Menos indicada para uso intenso diario'],
    highlight: 'Melhor custo-beneficio',
    score: 8.6,
  },
];

function query(strapi, modelUid) {
  return strapi.db.query(modelUid);
}

async function upsertBySlug(strapi, modelUid, slug, data) {
  const existing = await query(strapi, modelUid).findOne({ where: { slug } });

  if (existing) {
    return query(strapi, modelUid).update({
      where: { id: existing.id },
      data,
    });
  }

  return query(strapi, modelUid).create({ data });
}

async function upsertAffiliateLink(strapi, product, marketplace) {
  const trackingCode = `gtf-local-seed-${product.slug}`;
  const data = {
    originalUrl: `https://example.com/local-seed/original/${product.slug}`,
    affiliateUrl: `https://example.com/local-seed/affiliate/${product.slug}`,
    trackingCode,
    status: 'active',
    createdFrom: 'manual',
    product: product.id,
    marketplace: marketplace.id,
  };
  const existing = await query(strapi, uid.affiliateLink).findOne({
    where: { trackingCode },
  });

  if (existing) {
    return query(strapi, uid.affiliateLink).update({
      where: { id: existing.id },
      data,
    });
  }

  return query(strapi, uid.affiliateLink).create({ data });
}

async function upsertSeo(strapi, page) {
  const data = {
    metaTitle: 'Top 10 serras mármore para comprar em 2026',
    metaDescription:
      'Veja uma seleção de serras mármore para construção, reforma e pequenos serviços.',
    canonicalUrl: '/construcao/top-10-serras-marmore',
    ogTitle: 'Top 10 serras mármore para comprar em 2026',
    ogDescription:
      'Compare serras mármore fictícias para validar o fluxo local entre Strapi e Next.js.',
    robots: 'indexFollow',
    status: 'approved',
    approvedAt: now(),
    schemaType: 'itemList',
    schemaData: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Top 10 serras mármore',
    },
    focusKeyword: 'top 10 serras mármore',
    secondaryKeywords: [
      'melhor serra mármore',
      'serra mármore para construção',
      'serra mármore mercado livre',
    ],
  };
  const existingSeoId = page?.seo?.id;
  const existingByKeyword = await query(strapi, uid.seo).findOne({
    where: {
      focusKeyword: 'top 10 serras mármore',
      canonicalUrl: '/construcao/top-10-serras-marmore',
    },
  });
  const existing = existingSeoId ? { id: existingSeoId } : existingByKeyword;

  if (existing) {
    return query(strapi, uid.seo).update({
      where: { id: existing.id },
      data,
    });
  }

  return query(strapi, uid.seo).create({ data });
}

async function upsertFaq(strapi, page, faq) {
  const data = {
    ...faq,
    status: 'active',
    generatedByAi: false,
    approvedAt: now(),
    page: page.id,
  };
  const existing = await query(strapi, uid.faq).findOne({
    where: {
      question: faq.question,
      page: {
        id: page.id,
      },
    },
  });

  if (existing) {
    return query(strapi, uid.faq).update({
      where: { id: existing.id },
      data,
    });
  }

  return query(strapi, uid.faq).create({ data });
}

async function upsertRanking(strapi, page) {
  const data = {
    title: 'Top 10 serras mármore',
    slug: 'top-10-serras-marmore',
    description:
      'Ranking local com opções fictícias de serras mármore para validar a página dinâmica.',
    searchIntent:
      'Ajudar usuários a comparar serras mármore para construção, reforma e pequenos serviços.',
    editorialNotes:
      'Seed local para validar Product -> Ranking -> RankingItem -> Page pública.',
    evaluationCriteria: {
      seed: 'local',
      criteria: ['potência', 'custo-benefício', 'marca', 'uso em reforma'],
    },
    rankingType: 'top10',
    status: 'published',
    generatedByAi: false,
    reviewedAt: now(),
    page: page.id,
  };
  const existing = await query(strapi, uid.ranking).findOne({
    where: {
      page: {
        id: page.id,
      },
    },
  });

  if (existing) {
    return query(strapi, uid.ranking).update({
      where: { id: existing.id },
      data,
    });
  }

  return query(strapi, uid.ranking).create({ data });
}

async function upsertRankingItem(strapi, ranking, product, affiliateLink, item) {
  const data = {
    ...item,
    ctaText: 'Ver no Mercado Livre',
    status: 'active',
    ranking: ranking.id,
    product: product.id,
    affiliateLink: affiliateLink.id,
  };
  const existing = await query(strapi, uid.rankingItem).findOne({
    where: {
      ranking: {
        id: ranking.id,
      },
      position: item.position,
    },
  });

  if (existing) {
    return query(strapi, uid.rankingItem).update({
      where: { id: existing.id },
      data,
    });
  }

  return query(strapi, uid.rankingItem).create({ data });
}

async function seed(strapi) {
  const category = await upsertBySlug(strapi, uid.category, 'construcao', {
    name: 'Construção',
    slug: 'construcao',
    description: 'Guias e rankings locais de teste para construção.',
    status: 'active',
    order: 1,
  });

  const subCategory = await upsertBySlug(
    strapi,
    uid.subCategory,
    'ferramentas-eletricas',
    {
      name: 'Ferramentas elétricas',
      slug: 'ferramentas-eletricas',
      description: 'Ferramentas elétricas para construção, reforma e manutenção.',
      status: 'active',
      order: 1,
      category: category.id,
    }
  );

  const marketplace = await upsertBySlug(strapi, uid.marketplace, 'mercado-livre', {
    name: 'Mercado Livre',
    slug: 'mercado-livre',
    baseUrl: 'https://www.mercadolivre.com.br',
    status: 'active',
  });

  const seededProducts = [];
  const seededAffiliateLinks = [];

  for (const product of products) {
    const savedProduct = await upsertBySlug(strapi, uid.product, product.slug, {
      ...product,
      description: `${product.shortDescription} Produto fictício criado apenas para testes locais.`,
      marketplaceProductId: `local-seed-${product.slug}`,
      marketplaceUrl: `https://example.com/local-seed/product/${product.slug}`,
      currency: 'BRL',
      soldQuantity: 0,
      attributes: {
        seed: 'local',
        productType: 'serra-marmore',
      },
      status: 'approved',
      availability: 'inStock',
      lastCheckedAt: now(),
      lastSyncedAt: now(),
      marketplace: marketplace.id,
      category: category.id,
      subCategory: subCategory.id,
    });
    const affiliateLink = await upsertAffiliateLink(strapi, savedProduct, marketplace);

    seededProducts.push(savedProduct);
    seededAffiliateLinks.push(affiliateLink);
  }

  const existingPage = await query(strapi, uid.page).findOne({
    where: { slug: 'top-10-serras-marmore' },
    populate: {
      seo: true,
    },
  });
  const seo = await upsertSeo(strapi, existingPage);
  const pageData = {
    title: 'Top 10 serras mármore',
    slug: 'top-10-serras-marmore',
    pageType: 'ranking',
    status: 'published',
    excerpt:
      'Veja uma seleção local de serras mármore para testar o fluxo entre Strapi e Next.js.',
    intro:
      '<p>Este conteúdo de teste reúne serras mármore fictícias e realistas para validar a página dinâmica, SEO, ranking, FAQs e links afiliados no ambiente local.</p>',
    content: [],
    conclusion:
      '<p>Para o teste ponta a ponta, a melhor opção é conferir se os cards aparecem com preço, nota, prós, contras e botão de oferta.</p>',
    canonicalUrl: '/construcao/top-10-serras-marmore',
    approvedAt: now(),
    publishedAt: now(),
    category: category.id,
    subCategory: subCategory.id,
    seo: seo.id,
  };
  const page = existingPage
    ? await query(strapi, uid.page).update({
        where: { id: existingPage.id },
        data: pageData,
      })
    : await query(strapi, uid.page).create({ data: pageData });

  for (const faq of faqs) {
    await upsertFaq(strapi, page, faq);
  }

  const ranking = await upsertRanking(strapi, page);

  for (const item of rankingItems) {
    const product = seededProducts[item.position - 1];
    const affiliateLink = seededAffiliateLinks[item.position - 1];

    await upsertRankingItem(strapi, ranking, product, affiliateLink, item);
  }

  return {
    category,
    subCategory,
    marketplace,
    page,
    ranking,
    products: seededProducts,
  };
}

async function main() {
  const app = await createStrapi().load();

  try {
    const result = await seed(app);

    console.log('Local seed completed successfully.');
    console.log(`Category: ${result.category.slug}`);
    console.log(`SubCategory: ${result.subCategory.slug}`);
    console.log(`Marketplace: ${result.marketplace.slug}`);
    console.log(`Page: ${result.page.slug}`);
    console.log(`Ranking: ${result.ranking.title}`);
    console.log(`Products: ${result.products.map((product) => product.slug).join(', ')}`);
  } finally {
    await app.destroy();
  }
}

main().catch((error) => {
  console.error('Local seed failed.');
  console.error(error);
  process.exit(1);
});
