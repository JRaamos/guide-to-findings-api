# Guide to Findings — Modelagem do Banco de Dados e Content Types

## Objetivo

Definir a estrutura inicial de banco de dados e content types do projeto Guide to Findings.

O projeto terá nomes técnicos em inglês no código, banco e API, enquanto os textos exibidos ao usuário poderão ser em português.

A modelagem deve permitir:

- criação de páginas dinâmicas pelo Strapi;
- renderização automática no frontend;
- SEO forte;
- rankings de produtos;
- artigos;
- guias;
- comparativos;
- integração com marketplaces;
- links de afiliado;
- geração de conteúdo com IA;
- analytics de cliques.

---

# Entidade Central

## Page

A entidade Page é a mais importante do projeto.

Ela representa qualquer página pública que pode ser renderizada pelo frontend.

Exemplos:

- Top 10 serras mármore
- Top 10 celulares
- Como escolher uma furadeira
- Bosch vs Makita
- Melhores capacetes para moto

Cada nova página criada no Strapi deve gerar automaticamente uma página no frontend.

---

# Content Types Principais

## 1. Page

Representa uma página pública ou rascunho.

### Campos

txt title: string slug: uid pageType: enumeration status: enumeration excerpt: text intro: richText content: dynamicZone conclusion: richText publishedAt: datetime canonicalUrl: string featuredImage: media 

### pageType

txt ranking article comparison buyingGuide categoryLanding 

### status

txt draft review published archived 

### Relações

txt category: manyToOne -> Category subCategory: manyToOne -> SubCategory seo: oneToOne -> Seo ranking: oneToOne -> Ranking faqs: oneToMany -> Faq relatedPages: manyToMany -> Page 

---

## 2. Category

Representa uma categoria principal.

Exemplos:

- Construção
- Tecnologia
- Carros e motos

### Campos

txt name: string slug: uid description: text status: enumeration featuredImage: media order: integer 

### status

txt active inactive 

### Relações

txt subCategories: oneToMany -> SubCategory pages: oneToMany -> Page 

---

## 3. SubCategory

Representa uma subcategoria.

Exemplos:

- Ferramentas elétricas
- Smartphones
- Acessórios automotivos

### Campos

txt name: string slug: uid description: text status: enumeration order: integer 

### Relações

txt category: manyToOne -> Category pages: oneToMany -> Page products: oneToMany -> Product 

---

## 4. Product

Representa um produto importado ou cadastrado manualmente.

### Campos

txt name: string slug: uid description: text shortDescription: text marketplaceProductId: string marketplaceUrl: string imageUrl: string price: decimal oldPrice: decimal currency: string rating: decimal reviewCount: integer soldQuantity: integer brand: string model: string attributes: json status: enumeration lastSyncedAt: datetime 

### status

txt imported review approved rejected archived 

### Relações

txt marketplace: manyToOne -> Marketplace category: manyToOne -> Category subCategory: manyToOne -> SubCategory affiliateLinks: oneToMany -> AffiliateLink rankingItems: oneToMany -> RankingItem 

---

## 5. Marketplace

Representa uma plataforma de origem dos produtos.

Exemplos:

- Mercado Livre
- Amazon
- Shopee

### Campos

txt name: string slug: uid baseUrl: string status: enumeration logo: media 

### status

txt active inactive 

### Relações

txt products: oneToMany -> Product affiliateLinks: oneToMany -> AffiliateLink 

---

## 6. AffiliateLink

Representa o link de afiliado de um produto.

### Campos

txt originalUrl: string affiliateUrl: string trackingCode: string status: enumeration createdFrom: enumeration lastCheckedAt: datetime 

### status

txt active inactive broken 

### createdFrom

txt manual api generated 

### Relações

txt product: manyToOne -> Product marketplace: manyToOne -> Marketplace clickEvents: oneToMany -> ClickEvent 

---

## 7. Ranking

Representa uma lista ranqueada dentro de uma página.

Exemplo:

- Top 10 serras mármore
- Top 10 celulares

### Campos

txt title: string description: text rankingType: enumeration status: enumeration generatedByAi: boolean reviewedAt: datetime 

### rankingType

txt top10 top5 bestCostBenefit bestOverall comparison 

### status

txt draft review published archived 

### Relações

txt page: oneToOne -> Page items: oneToMany -> RankingItem 

---

## 8. RankingItem

Representa um produto dentro de um ranking.

### Campos

txt position: integer title: string summary: text pros: json cons: json highlight: string score: decimal ctaText: string status: enumeration 

### status

txt active inactive 

### Relações

txt ranking: manyToOne -> Ranking product: manyToOne -> Product affiliateLink: manyToOne -> AffiliateLink 

---

## 9. Faq

Representa perguntas e respostas de uma página.

### Campos

txt question: string answer: richText order: integer status: enumeration 

### status

txt active inactive 

### Relações

txt page: manyToOne -> Page 

---

## 10. Seo

Representa os dados SEO de uma página.

### Campos

txt metaTitle: string metaDescription: text canonicalUrl: string ogTitle: string ogDescription: text ogImage: media robots: enumeration schemaType: enumeration schemaData: json focusKeyword: string secondaryKeywords: json 

### robots

txt indexFollow noIndexFollow noIndexNoFollow 

### schemaType

txt article itemList product faqPage breadcrumbList comparison 

### Relações

txt page: oneToOne -> Page 

---

## 11. AiGenerationLog

Registra gerações feitas com IA.

### Campos

txt provider: string model: string promptType: enumeration prompt: text inputData: json outputData: json status: enumeration errorMessage: text tokensInput: integer tokensOutput: integer costEstimate: decimal generatedAt: datetime 

### promptType

txt seo ranking productSummary faq article comparison buyingGuide metadata 

### status

txt success failed review approved rejected 

### Relações

txt page: manyToOne -> Page product: manyToOne -> Product ranking: manyToOne -> Ranking 

---

## 12. ClickEvent

Registra cliques em produtos e links afiliados.

### Campos

txt eventType: enumeration sourcePageUrl: string sourcePageTitle: string userAgent: text referrer: string ipHash: string clickedAt: datetime 

### eventType

txt productClick affiliateClick ctaClick 

### Relações

txt page: manyToOne -> Page product: manyToOne -> Product affiliateLink: manyToOne -> AffiliateLink marketplace: manyToOne -> Marketplace 

---

# Dynamic Zone de Conteúdo

A entidade Page deve ter um campo content.

Esse campo deve ser uma Dynamic Zone no Strapi.

## Blocos iniciais

txt textBlock imageBlock productListBlock rankingBlock faqBlock comparisonTableBlock calloutBlock ctaBlock 

---

# Componentes Reutilizáveis do Strapi

## seoComponent

txt metaTitle metaDescription canonicalUrl ogTitle ogDescription ogImage robots schemaType schemaData focusKeyword secondaryKeywords 

---

## productProsConsComponent

txt pros cons 

---

## faqItemComponent

txt question answer order 

---

## comparisonItemComponent

txt label firstValue secondValue highlight 

---

# Relações Principais

## Category

txt Category → has many SubCategory → has many Page → has many Product 

## Page

txt Page → belongs to Category → belongs to SubCategory → has one Seo → has one Ranking → has many Faq → has many relatedPages 

## Product

txt Product → belongs to Marketplace → belongs to Category → belongs to SubCategory → has many AffiliateLink → appears in many RankingItem 

## Ranking

txt Ranking → belongs to Page → has many RankingItem 

## RankingItem

txt RankingItem → belongs to Ranking → belongs to Product → belongs to AffiliateLink 

---

# Campos Obrigatórios por Tipo de Página

## ranking

Obrigatórios:

txt title slug category pageType status seo ranking intro faqs 

---

## article

Obrigatórios:

txt title slug category pageType status seo content 

---

## comparison

Obrigatórios:

txt title slug category pageType status seo content relatedPages 

---

## buyingGuide

Obrigatórios:

txt title slug category pageType status seo content faqs 

---

## categoryLanding

Obrigatórios:

txt title slug category pageType status seo content relatedPages 

---

# Regras de Publicação

## Página publicada

Uma Page só pode ser considerada pública quando:

txt status = published publishedAt preenchido seo preenchido category preenchida slug preenchido 

---

## Página draft

Não deve aparecer:

txt sitemap frontend público links internos busca pública 

---

## Página archived

Deve:

txt sair do sitemap não ser indexável retornar 404 ou redirect 

---

# Regras de URL

A URL pública deve seguir:

txt /{category.slug}/{page.slug} 

Exemplo:

txt /construcao/top-10-serras-marmore /tecnologia/top-10-celulares /carros-e-motos/top-10-capacetes 

---

# Regras de SEO

Cada página deve possuir:

txt metaTitle metaDescription canonicalUrl schemaData focusKeyword secondaryKeywords robots 

---

# Regras de Indexação

Somente páginas com:

txt status = published robots = indexFollow 

devem entrar no sitemap.

---

# Regras para IA

A IA pode gerar:

txt seo intro summary pros cons faq comparison conclusion metadata 

Mas no início, nenhuma geração deve ser publicada sem revisão humana.

---

# Regras para Analytics

O sistema deve registrar:

txt page views via Google Analytics product clicks via ClickEvent affiliate clicks via ClickEvent search queries via Google Analytics/Search Console 

O Strapi deve armazenar principalmente os eventos internos de clique.

---

# MVP do Banco

Para o MVP, os content types essenciais são:

txt Page Category SubCategory Product Marketplace AffiliateLink Ranking RankingItem Seo Faq ClickEvent AiGenerationLog 

---

# Ordem de Criação no Strapi

A ordem recomendada é:

txt 1. Category 2. SubCategory 3. Marketplace 4. Product 5. AffiliateLink 6. Seo 7. Faq 8. Page 9. Ranking 10. RankingItem 11. AiGenerationLog 12. ClickEvent 

---

# Observações Técnicas

- Usar PostgreSQL.
- Usar nomes técnicos em inglês.
- Usar conteúdo em português.
- Separar conteúdo, SEO e analytics.
- Evitar duplicação de produtos.
- Evitar duplicação de páginas com a mesma intenção.
- Criar índices para slugs, status e marketplaceProductId.
- Preparar o banco para múltiplos marketplaces no futuro.
- Preparar a estrutura para milhares de páginas.
- Manter publicação controlada por status.

---

# Conclusão

A modelagem do banco do Guide to Findings deve ser centrada na entidade Page.

A Page define o que existe no frontend.

O frontend apenas renderiza o tipo correto de template com base nos dados vindos do Strapi.

Essa arquitetura permite criar novas páginas diretamente pelo CMS, mantendo:

- SEO forte
- escalabilidade
- controle editorial
- automação com IA
- integração com marketplaces
- performance no frontend
- crescimento organizado
