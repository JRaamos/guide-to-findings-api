# Guia dos Achados — Arquitetura de Páginas Dinâmicas e SEO

# Objetivo

Definir a arquitetura de páginas dinâmicas do projeto Guia dos Achados, garantindo:

- máxima otimização para SEO
- geração automática de páginas
- estrutura escalável
- URLs amigáveis
- performance
- indexação eficiente
- reutilização de templates
- compatibilidade com mecanismos de busca e IA

O frontend não deve depender da criação manual de páginas.

As páginas devem ser criadas dinamicamente a partir do conteúdo configurado no Strapi.

---

# Conceito Principal

O projeto será baseado em:

# Dynamic SEO Driven Pages

O frontend terá poucos templates reutilizáveis.

O backend (Strapi) será responsável por definir:

- qual página existe
- qual tipo de página será renderizado
- qual conteúdo será exibido
- quais produtos serão usados
- quais blocos SEO serão usados

O frontend apenas interpreta os dados vindos do backend e monta a página automaticamente.

---

# Funcionamento Geral

## Exemplo

No Strapi:

txt title: Top 10 serras mármore category: Construção slug: top-10-serras-marmore pageType: ranking status: published 

Após publicação:

txt /construcao/top-10-serras-marmore 

O frontend usa automaticamente o template:

txt RankingTemplate 

Sem precisar criar código novo.

---

# Benefícios da Arquitetura

## Escalabilidade

Permite criar:
- dezenas
- centenas
- milhares

de páginas usando poucos templates.

---

## SEO Forte

Cada página terá:
- URL própria
- metadata própria
- schema próprio
- conteúdo próprio
- indexação própria

---

## Performance

As páginas serão:
- estáticas quando possível
- geradas por ISR
- cacheadas
- extremamente rápidas

---

## Facilidade Operacional

Administradores conseguem:
- criar páginas
- revisar IA
- publicar rankings
- atualizar conteúdo

sem alterar frontend.

---

# Estrutura de URLs

# Objetivo

As URLs devem:
- ser semânticas
- amigáveis
- legíveis
- curtas
- contextuais
- boas para Google

---

# Estrutura Oficial

txt /{categorySlug}/{contentSlug} 

---

# Exemplos

## Rankings

txt /construcao/top-10-serras-marmore /tecnologia/top-10-celulares /carros-e-motos/top-10-capacetes 

---

## Guias

txt /construcao/como-escolher-furadeira /tecnologia/como-escolher-ssd 

---

## Comparativos

txt /tecnologia/iphone-16-vs-s24 /construcao/bosch-vs-makita 

---

# Motivo da Estrutura

Essa estrutura:
- melhora contexto semântico
- melhora SEO
- melhora CTR
- melhora legibilidade
- ajuda IA a entender contexto

---

# Tipos de Página

O sistema deve suportar múltiplos tipos de página.

---

# 1. Ranking Page

Exemplo:

txt Top 10 serras mármore 

Objetivo:
- listas
- recomendações
- afiliados
- produtos ranqueados

Template:

txt RankingTemplate 

---

# 2. Article Page

Exemplo:

txt Como escolher uma furadeira 

Objetivo:
- conteúdo editorial
- SEO informacional
- captura de busca

Template:

txt ArticleTemplate 

---

# 3. Comparison Page

Exemplo:

txt Bosch vs Makita 

Objetivo:
- comparação
- intenção forte de compra

Template:

txt ComparisonTemplate 

---

# 4. Buying Guide Page

Exemplo:

txt Melhor SSD para notebook 

Objetivo:
- recomendação especializada
- guia aprofundado

Template:

txt BuyingGuideTemplate 

---

# 5. Category Page

Exemplo:

txt /construcao 

Objetivo:
- consolidar autoridade
- organizar conteúdo
- melhorar SEO interno

Template:

txt CategoryTemplate 

---

# Estrutura de Rotas

# Next.js App Router

Estrutura recomendada:

txt src/app/   [categorySlug]/     [contentSlug]/       page.js 

---

# Funcionamento

A rota recebe:

txt categorySlug contentSlug 

O frontend:
- busca no Strapi
- identifica o tipo
- renderiza o template correto

---

# Exemplo

## URL

txt /construcao/top-10-serras-marmore 

## Backend retorna

json {   "pageType": "ranking" } 

## Frontend renderiza

txt RankingTemplate 

---

# Renderização Dinâmica

A tela dinâmica deve funcionar como um roteador de templates.

---

# Fluxo

txt URL → busca conteúdo no Strapi → identifica pageType → renderiza template correto 

---

# Estrutura Recomendada

txt screens/   DynamicPage/ 

---

# Exemplo

js switch (pageType) {   case 'ranking':     return <RankingTemplate />;    case 'article':     return <ArticleTemplate />;    case 'comparison':     return <ComparisonTemplate />;    case 'buying-guide':     return <BuyingGuideTemplate />; } 

---

# Templates

Os templates devem ser reutilizáveis.

---

# Estrutura

txt templates/   RankingTemplate/   ArticleTemplate/   ComparisonTemplate/   BuyingGuideTemplate/   CategoryTemplate/ 

---

# Responsabilidade do Template

Cada template:
- recebe dados
- monta a página
- renderiza SEO
- renderiza schema
- renderiza blocos

---

# RankingTemplate

Deve renderizar:

- hero SEO
- introdução
- lista Top 10
- ProductRankingCard
- guia de compra
- FAQ
- conclusão
- blocos internos
- links internos

---

# ArticleTemplate

Deve renderizar:

- conteúdo editorial
- headings
- imagens
- produtos relacionados
- FAQ
- links internos

---

# ComparisonTemplate

Deve renderizar:

- comparação lado a lado
- vantagens
- desvantagens
- tabela comparativa
- recomendação final

---

# Estrutura de Conteúdo

O backend deve controlar:

- title
- slug
- category
- pageType
- status
- seoTitle
- seoDescription
- contentBlocks
- faq
- schema
- products
- breadcrumbs
- canonicalUrl
- publishedAt

---

# Status de Página

Cada página deve possuir:

txt draft review published archived 

---

# Regras de Publicação

## draft

Página invisível.

---

## review

Página pronta para revisão.

---

## published

Página pública e indexável.

---

## archived

Página removida da indexação.

---

# SEO Técnico

O sistema deve gerar automaticamente:

- title
- meta description
- canonical
- Open Graph
- Twitter Card
- breadcrumbs
- schema.org
- sitemap

---

# Metadata Dinâmica

Cada página deve possuir metadata própria.

---

# Exemplo

txt Title: Top 10 serras mármore em 2026  Description: Veja as melhores serras mármore para comprar no Mercado Livre. 

---

# Canonical

Todas as páginas devem gerar canonical automaticamente.

---

# Exemplo

html <link rel="canonical" href="https://guiadosachados.com/construcao/top-10-serras-marmore" /> 

---

# Schema.org

O sistema deve gerar schema automaticamente.

---

# Ranking Pages

Devem gerar:
- ItemList
- Product
- FAQPage

---

# Articles

Devem gerar:
- Article
- FAQPage

---

# Comparisons

Devem gerar:
- Product
- Review
- Comparison

---

# Breadcrumbs

Todas as páginas devem gerar breadcrumbs estruturados.

---

# Exemplo

txt Home → Construção → Top 10 serras mármore 

---

# Sitemap

O sitemap deve ser:
- dinâmico
- automático
- atualizado por publicação

---

# Regras do Sitemap

Somente páginas:
txt published 

devem entrar no sitemap.

---

# Robots.txt

Deve permitir indexação apenas de páginas públicas.

---

# ISR — Incremental Static Regeneration

# Objetivo

Garantir:
- performance
- SEO
- baixo custo
- páginas rápidas

---

# Estratégia Oficial

Todas as páginas públicas devem usar ISR.

---

# Exemplo

js export const revalidate = 3600; 

---

# Benefícios

- páginas estáticas
- carregamento rápido
- cache automático
- rebuild parcial

---

# Revalidação

Quando uma página for publicada no Strapi:

- webhook dispara
- Next.js revalida rota
- página atualiza automaticamente

---

# Fallbacks

# Página inexistente

Deve retornar:
txt 404 

---

# Página draft

Não deve ser acessível publicamente.

---

# Página archived

Deve:
- sair do sitemap
- retornar 404 ou redirect

---

# Estratégia de Conteúdo

As páginas devem ser:
- profundas
- úteis
- escaneáveis
- organizadas
- semânticas

---

# Estrutura Recomendada

## Ranking

- introdução
- lista Top 10
- análise dos produtos
- guia de compra
- FAQ
- conclusão

---

# SEO para IA

O conteúdo deve ser estruturado para:
- AI Overviews
- ChatGPT Search
- Gemini
- Perplexity
- assistentes de IA

---

# Estratégias

- headings claros
- respostas objetivas
- listas estruturadas
- FAQs
- conteúdo semântico
- tabelas
- resumos

---

# Internal Linking

Todas as páginas devem gerar:
- links relacionados
- categorias relacionadas
- rankings relacionados
- artigos relacionados

---

# Objetivo

- aumentar autoridade
- melhorar crawl
- melhorar SEO
- aumentar tempo de navegação

---

# Cache

As páginas devem usar:
- cache do Next.js
- ISR
- cache HTTP quando possível

---

# Objetivo

Reduzir:
- chamadas ao backend
- tempo de carregamento
- custo de infraestrutura

---

# Estrutura Final Esperada

## Backend

Strapi define:
- conteúdo
- SEO
- tipo
- publicação

---

## Frontend

Next.js:
- busca dados
- identifica template
- renderiza página
- otimiza SEO
- gera páginas rápidas

---

# Fluxo Completo

txt Admin cria página no Strapi → IA ajuda gerar conteúdo → Admin revisa → Página é publicada → Webhook dispara → Next.js revalida ISR → Página pública disponível → Google indexa 

---

# Conclusão

A arquitetura do Guia dos Achados deve ser totalmente orientada por:

- SEO
- páginas dinâmicas
- templates reutilizáveis
- performance
- automação
- escalabilidade

O frontend não deve depender da criação manual de páginas.

Toda nova página deve ser criada apenas pelo backend e renderizada automaticamente pelo frontend usando templates reutilizáveis.

Essa arquitetura permite escalar o projeto mantendo:
- alta performance
- baixo custo
- boa indexação
- excelente experiência para Google e IA.
