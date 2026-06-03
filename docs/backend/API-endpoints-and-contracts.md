# Guide to Findings — Endpoints e Contratos da API

## Objetivo

Definir os endpoints necessários para conectar o backend Strapi ao frontend Next.js do projeto Guide to Findings.

Este documento foca nos contratos de dados necessários para:

- renderizar páginas dinâmicas;
- montar páginas SEO;
- gerar sitemap;
- listar categorias;
- exibir rankings;
- registrar cliques;
- integrar com revalidação do Next.js;
- manter o frontend desacoplado da estrutura interna do Strapi.

Os nomes técnicos devem permanecer em inglês.  
Os textos exibidos ao usuário podem permanecer em português.

---

# Princípios da API

## 1. O frontend não deve montar regra de negócio

O frontend deve receber os dados prontos para renderização.

Ele pode decidir qual template usar, mas não deve precisar interpretar regras complexas.

---

## 2. A entidade Page controla a renderização

A API principal do frontend será baseada em Page.

Uma página publicada no Strapi deve ser suficiente para gerar uma página pública no Next.js.

---

## 3. Somente conteúdo publicado deve ser público

Endpoints públicos devem retornar apenas dados com:

txt status = published 

e, quando aplicável:

txt robots = indexFollow 

---

## 4. Contratos devem ser estáveis

Mesmo que a estrutura interna do Strapi mude, o frontend deve receber respostas consistentes.

---

# Endpoints Públicos

---

# 1. Buscar Página Dinâmica

## Endpoint

txt GET /api/public/pages/:categorySlug/:contentSlug 

## Objetivo

Buscar os dados completos de uma página pública para renderização no frontend.

## Exemplo

txt GET /api/public/pages/construcao/top-10-serras-marmore 

## Uso no frontend

Usado pela rota:

txt /{categorySlug}/{contentSlug} 

## Regra

Retornar somente páginas:

txt status = published 

## Resposta esperada

json {   "id": 1,   "title": "Top 10 serras mármore",   "slug": "top-10-serras-marmore",   "pageType": "ranking",   "status": "published",   "excerpt": "Veja as melhores serras mármore para comprar no Mercado Livre.",   "intro": "<p>Selecionamos opções com boa reputação, preço competitivo e avaliações positivas.</p>",   "conclusion": "<p>A melhor escolha depende do seu tipo de uso e orçamento.</p>",   "publishedAt": "2026-06-03T10:00:00.000Z",   "canonicalUrl": "https://guidetofindings.com/construcao/top-10-serras-marmore",   "featuredImage": {     "url": "https://cdn.com/image.jpg",     "alt": "Serras mármore"   },   "category": {     "id": 1,     "name": "Construção",     "slug": "construcao"   },   "subCategory": {     "id": 2,     "name": "Ferramentas elétricas",     "slug": "ferramentas-eletricas"   },   "seo": {     "metaTitle": "Top 10 serras mármore em 2026",     "metaDescription": "Veja as melhores serras mármore para comprar no Mercado Livre.",     "canonicalUrl": "https://guidetofindings.com/construcao/top-10-serras-marmore",     "robots": "indexFollow",     "focusKeyword": "top 10 serras mármore",     "secondaryKeywords": [       "melhor serra mármore",       "serra mármore mercado livre"     ],     "schemaType": "itemList",     "schemaData": {}   },   "ranking": {     "id": 10,     "title": "Top 10 serras mármore",     "description": "Ranking com opções selecionadas para diferentes tipos de uso.",     "rankingType": "top10",     "items": [       {         "id": 100,         "position": 1,         "title": "Serra Mármore Bosch",         "summary": "Boa opção para quem procura desempenho e durabilidade.",         "pros": [           "Boa potência",           "Marca reconhecida"         ],         "cons": [           "Preço mais alto"         ],         "highlight": "Melhor escolha geral",         "score": 9.2,         "ctaText": "Ver no Mercado Livre",         "product": {           "id": 200,           "name": "Serra Mármore Bosch",           "slug": "serra-marmore-bosch",           "imageUrl": "https://image.com/product.jpg",           "price": 399.9,           "oldPrice": 459.9,           "currency": "BRL",           "rating": 4.8,           "reviewCount": 1200,           "brand": "Bosch",           "model": "GDC 150"         },         "affiliateLink": {           "id": 300,           "affiliateUrl": "https://mercadolivre.com/affiliate-link"         }       }     ]   },   "faqs": [     {       "question": "Qual a melhor serra mármore para obra?",       "answer": "<p>Depende do tipo de uso, potência necessária e orçamento disponível.</p>",       "order": 1     }   ],   "contentBlocks": [],   "relatedPages": [     {       "title": "Como escolher uma furadeira",       "slug": "como-escolher-furadeira",       "categorySlug": "construcao",       "url": "/construcao/como-escolher-furadeira"     }   ],   "breadcrumbs": [     {       "label": "Início",       "url": "/"     },     {       "label": "Construção",       "url": "/construcao"     },     {       "label": "Top 10 serras mármore",       "url": "/construcao/top-10-serras-marmore"     }   ] } 

---

# 2. Buscar Página por Slug

## Endpoint

txt GET /api/public/pages/by-slug/:contentSlug 

## Objetivo

Permitir busca de página apenas pelo slug, quando necessário.

## Uso

Pode ser útil para redirecionamentos, previews ou buscas internas.

---

# 3. Listar Páginas Publicadas

## Endpoint

txt GET /api/public/pages 

## Query params

txt pageType category subCategory limit page 

## Exemplo

txt GET /api/public/pages?pageType=ranking&category=construcao&limit=10 

## Objetivo

Usado para:

- home;
- categorias;
- listas de conteúdos;
- links internos.

---

# 4. Listar Categorias

## Endpoint

txt GET /api/public/categories 

## Objetivo

Buscar categorias ativas para:

- menu;
- header;
- footer;
- home;
- páginas de categoria.

## Resposta esperada

json [   {     "id": 1,     "name": "Construção",     "slug": "construcao",     "description": "Guias e rankings de produtos para construção.",     "featuredImage": {       "url": "https://cdn.com/construcao.jpg",       "alt": "Construção"     },     "order": 1   } ] 

---

# 5. Buscar Categoria

## Endpoint

txt GET /api/public/categories/:categorySlug 

## Objetivo

Buscar os dados completos da página de categoria.

## Exemplo

txt GET /api/public/categories/construcao 

## Resposta esperada

json {   "id": 1,   "name": "Construção",   "slug": "construcao",   "description": "Guias e rankings para produtos de construção.",   "seo": {     "metaTitle": "Construção | Guide to Findings",     "metaDescription": "Veja guias e rankings de produtos para construção.",     "robots": "indexFollow"   },   "subCategories": [],   "pages": [] } 

---

# 6. Buscar Sitemap

## Endpoint

txt GET /api/public/sitemap 

## Objetivo

Retornar todas as URLs públicas indexáveis.

## Regra

Retornar somente páginas:

txt status = published robots = indexFollow 

## Resposta esperada

json [   {     "url": "https://guidetofindings.com/construcao/top-10-serras-marmore",     "lastModified": "2026-06-03T10:00:00.000Z",     "changeFrequency": "weekly",     "priority": 0.8   } ] 

---

# 7. Registrar Clique

## Endpoint

txt POST /api/public/click-events 

## Objetivo

Registrar cliques em produtos, CTAs e links afiliados.

## Payload

json {   "eventType": "affiliateClick",   "pageId": 1,   "productId": 200,   "affiliateLinkId": 300,   "marketplaceId": 1,   "sourcePageUrl": "/construcao/top-10-serras-marmore",   "sourcePageTitle": "Top 10 serras mármore" } 

## Resposta

json {   "success": true } 

## Observação

Este endpoint não deve bloquear a navegação do usuário.

O clique deve ser registrado de forma assíncrona no frontend.

---

# 8. Buscar Home

## Endpoint

txt GET /api/public/home 

## Objetivo

Retornar os dados necessários para montar a home.

## Resposta esperada

json {   "hero": {     "title": "Guia dos Achados",     "description": "Guias, rankings e recomendações para comprar melhor."   },   "categories": [],   "featuredRankings": [],   "latestArticles": [],   "buyingGuides": [] } 

---

# 9. Buscar Busca Interna

## Endpoint

txt GET /api/public/search?q=:query 

## Objetivo

Permitir busca interna por páginas, rankings e categorias.

## Exemplo

txt GET /api/public/search?q=serra%20marmore 

## Resposta esperada

json {   "query": "serra marmore",   "results": [     {       "type": "page",       "title": "Top 10 serras mármore",       "url": "/construcao/top-10-serras-marmore",       "excerpt": "Veja as melhores opções..."     }   ] } 

---

# Endpoints Administrativos / Internos

Esses endpoints podem ser protegidos por autenticação e usados por automações, workers ou ações internas.

---

# 10. Importar Produtos do Mercado Livre

## Endpoint

txt POST /api/internal/marketplaces/mercado-livre/search 

## Objetivo

Buscar produtos no Mercado Livre e salvar como produtos importados.

## Payload

json {   "query": "serra mármore",   "categoryId": 1,   "subCategoryId": 2,   "limit": 20 } 

## Resposta esperada

json {   "success": true,   "imported": 20,   "skipped": 3,   "products": [] } 

---

# 11. Gerar Conteúdo com IA

## Endpoint

txt POST /api/internal/ai/generate-page-content 

## Objetivo

Gerar conteúdo inicial de uma página usando IA.

## Payload

json {   "pageId": 1,   "promptType": "ranking",   "model": "gpt-4.1-mini" } 

## Resposta esperada

json {   "success": true,   "status": "review",   "aiGenerationLogId": 10 } 

---

# 12. Revalidar Página no Next.js

## Endpoint

txt POST /api/internal/revalidate-page 

## Objetivo

Notificar o frontend para atualizar uma página publicada.

## Payload

json {   "path": "/construcao/top-10-serras-marmore" } 

## Observação

Esse endpoint pode chamar o webhook do Next.js/Vercel.

---

# Contrato de PageType

O frontend deve suportar:

txt ranking article comparison buyingGuide categoryLanding 

---

# Contrato de Status

Público:

txt published 

Interno:

txt draft review published archived 

---

# Contrato de Robots

txt indexFollow noIndexFollow noIndexNoFollow 

---

# Contrato de RankingItem

Todo item de ranking deve ter:

txt position title summary pros cons highlight score ctaText product affiliateLink 

---

# Contrato de Produto

Todo produto público deve ter:

txt id name slug imageUrl price oldPrice currency rating reviewCount brand model 

---

# Contrato de SEO

Toda página pública deve ter:

txt metaTitle metaDescription canonicalUrl robots schemaType schemaData focusKeyword secondaryKeywords 

---

# Regras de Segurança

- Endpoints públicos não devem retornar rascunhos.
- Endpoints públicos não devem retornar dados sensíveis.
- Endpoints internos devem ser protegidos.
- Webhooks devem usar token secreto.
- Registro de clique não deve armazenar IP puro.
- Usar hash ou anonimização para dados sensíveis.

---

# Regras de Performance

- Endpoints públicos devem retornar apenas dados necessários.
- Evitar populações profundas desnecessárias.
- Evitar payload gigante em páginas simples.
- Separar endpoints de listagem e detalhe.
- Usar cache quando possível.
- Sitemap deve ser leve.
- Clique deve ser assíncrono.

---
