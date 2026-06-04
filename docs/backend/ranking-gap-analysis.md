# Ranking GAP Analysis

## 1. Resumo Executivo

Pergunta central:

```text
A modelagem atual suporta integralmente o workflow editorial definido?
```

Resposta:

```text
A modelagem atual NÃO está pronta integralmente.
```

Ela suporta uma V1 funcional de:

```text
Product
↓
Ranking
↓
RankingItem
```

Ela também suporta parcialmente:

```text
Ranking
↓
AI
↓
Page
↓
SEO
↓
Publicação
```

Mas há lacunas importantes para o workflow editorial completo, principalmente
em:

- contexto editorial do `Ranking`;
- estados de aprovação;
- rastreabilidade de conteúdo gerado por IA;
- aprovação de `Faq` e `Seo`;
- estoque/disponibilidade de `Product`;
- versionamento ou snapshots para rankings publicados;
- checklist formal de publicação.

## Status Após Evolução de Schemas - Fase 1

Após a primeira fase de evolução obrigatória, os seguintes GAPs foram
endereçados parcialmente:

```text
Ranking: slug, searchIntent, editorialNotes, evaluationCriteria
Product: availability, lastCheckedAt
Page: approvedAt, publishedAt
Seo: status, approvedAt
Faq: generatedByAi, approvedAt
```

Itens que continuam pendentes para fases futuras:

- `category` e `subCategory` persistidos diretamente em `Ranking`;
- status `approved` como enum em `Ranking` e `Page`;
- snapshots de `RankingItem`;
- versionamento de ranking;
- auditoria granular de aplicação de IA;
- checklist persistido de publicação.

Conclusão prática:

```text
Com a Fase 1 aplicada, o AI Generator pode ser iniciado como V1, desde que ele
trate `category` e `subCategory` via contexto de `Product` ou futura `Page`.
Para uma operação editorial madura, os GAPs pendentes ainda devem ser tratados.
```

## 2. Entidades Analisadas

Entidades analisadas:

```text
Category
SubCategory
Marketplace
Product
AffiliateLink
Ranking
RankingItem
Page
Seo
Faq
AiGenerationLog
ClickEvent
```

Referências usadas:

- `docs/backend/editorial-workflow.md`
- `docs/backend/content-lifecycle.md`
- `docs/backend/future-admin-modules.md`
- `docs/backend/ranking-to-page-workflow.md`
- `docs/backend/database-modeling-and-content-types.md`
- schemas atuais em `src/api/*/content-types/*/schema.json`

## 3. Análise Entidade por Entidade

### Category

#### Campos Atuais

- `name`
- `slug`
- `description`
- `status`
- `featuredImage`
- `order`
- `subCategories`
- `pages`
- `products`

#### Campos Utilizados no Workflow

- `name`: navegação, contexto editorial e breadcrumbs.
- `slug`: URL pública e filtros internos.
- `description`: página de categoria e contexto de IA.
- `status`: controle público ativo/inativo.
- `featuredImage`: suporte visual.
- `order`: ordenação pública e administrativa.
- `subCategories`, `pages`, `products`: relações essenciais.

#### Campos Não Utilizados

Nenhum campo estrutural parece sobrando para o workflow atual. `featuredImage`
e `order` podem ser pouco usados agora, mas são coerentes.

#### Campos Ausentes

- SEO próprio de categoria.
- Critérios editoriais por categoria.
- Guidelines de IA por categoria.

#### Avaliação

Suficiente para V1. Recomenda-se adicionar SEO/guidelines de categoria no futuro,
mas isso não bloqueia o Ranking Builder.

### SubCategory

#### Campos Atuais

- `name`
- `slug`
- `description`
- `status`
- `order`
- `category`
- `pages`
- `products`

#### Campos Utilizados no Workflow

- `name`, `slug`, `description`: contexto editorial e navegação.
- `status`: controle de elegibilidade.
- `category`: hierarquia obrigatória.
- `products`, `pages`: relações de filtro e publicação.

#### Campos Não Utilizados

- `order` pode ser pouco usado na V1, mas é útil para navegação.

#### Campos Ausentes

- SEO próprio.
- Guidelines editoriais.
- Critérios mínimos para rankings da subcategoria.

#### Avaliação

Suficiente para V1. Recomendado enriquecer para SEO e regras editoriais quando
as páginas de categoria/subcategoria ganharem peso.

### Marketplace

#### Campos Atuais

- `name`
- `slug`
- `baseUrl`
- `status`
- `logo`
- `products`
- `affiliateLinks`

#### Campos Utilizados no Workflow

- `name`, `slug`, `baseUrl`: origem do produto.
- `status`: controle de uso.
- `products`, `affiliateLinks`: relações necessárias para importação e CTA.

#### Campos Não Utilizados

- `logo` pode não ser usado ainda, mas é coerente para interface/admin.

#### Campos Ausentes

- configuração por marketplace;
- status de integração;
- última sincronização global;
- limites ou metadados de autenticação.

#### Avaliação

Suficiente para V1 do Mercado Livre. Insuficiente para operação madura de vários
marketplaces.

### Product

#### Campos Atuais

- `name`
- `slug`
- `description`
- `shortDescription`
- `marketplaceProductId`
- `marketplaceUrl`
- `imageUrl`
- `price`
- `oldPrice`
- `currency`
- `rating`
- `reviewCount`
- `soldQuantity`
- `brand`
- `model`
- `attributes`
- `status`
- `lastSyncedAt`
- `marketplace`
- `category`
- `subCategory`
- `affiliateLinks`
- `rankingItems`

#### Campos Utilizados no Workflow

- `name`, `slug`, `description`, `shortDescription`: conteúdo e cards.
- `marketplaceProductId`, `marketplaceUrl`: origem e idempotência.
- `imageUrl`: visual público.
- `price`, `oldPrice`, `currency`: ranking, CTA e atualização.
- `rating`, `reviewCount`, `soldQuantity`: sinais editoriais.
- `brand`, `model`, `attributes`: IA, filtros e comparação.
- `status`: fluxo `imported`, `review`, `approved`, `rejected`, `archived`.
- `lastSyncedAt`: atualização.
- relações com `Marketplace`, `Category`, `SubCategory`, `AffiliateLink`,
  `RankingItem`.

#### Campos Não Utilizados

Nenhum campo claramente desnecessário. `rating` e `reviewCount` dependem da
qualidade da fonte externa.

#### Campos Ausentes

- estoque/disponibilidade (`inStock`, `availability`, `availableQuantity` ou
  equivalente).
- status de oferta separado do status editorial.
- data da última verificação de disponibilidade.
- imagem como media local, se a estratégia futura exigir controle interno.
- histórico de preço.
- fonte de dados/preço por marketplace quando houver múltiplos sellers.

#### Análise Específica

```text
brand: suficiente
price: suficiente para valor atual
currency: suficiente
stock: insuficiente
image: suficiente para V1 via imageUrl, incompleto para controle editorial
affiliate link: suportado via relação
marketplace: suportado
```

#### Avaliação

Suficiente para ranking manual V1. Insuficiente para atualização editorial
robusta, especialmente quando produto sai de estoque, muda preço ou é removido.

### AffiliateLink

#### Campos Atuais

- `originalUrl`
- `affiliateUrl`
- `trackingCode`
- `status`
- `createdFrom`
- `lastCheckedAt`
- `product`
- `marketplace`
- `clickEvents`

#### Campos Utilizados no Workflow

- `affiliateUrl`: CTA.
- `originalUrl`: auditoria/origem.
- `trackingCode`: futuro tracking.
- `status`: `active`, `inactive`, `broken`.
- `createdFrom`: manual, api, generated.
- `lastCheckedAt`: revisão de link.
- relações com `Product`, `Marketplace`, `ClickEvent`.

#### Campos Não Utilizados

- `trackingCode` pode estar pouco usado agora, mas é necessário no futuro.

#### Campos Ausentes

- tipo de link ou campanha;
- data de expiração;
- motivo de quebra;
- última resposta HTTP;
- prioridade quando houver múltiplos links ativos para um produto.

#### Avaliação

Suficiente para V1. Recomendado enriquecer antes de analytics/afiliados maduros.

### Ranking

#### Campos Atuais

- `title`
- `description`
- `rankingType`
- `status`
- `generatedByAi`
- `reviewedAt`
- `page`
- `items`

#### Campos Utilizados no Workflow

- `title`: nome editorial.
- `description`: contexto editorial.
- `rankingType`: tipo da lista.
- `status`: `draft`, `review`, `published`, `archived`.
- `generatedByAi`: sinal de assistência por IA.
- `reviewedAt`: auditoria mínima.
- `page`: publicação final.
- `items`: produtos ranqueados.

#### Campos Não Utilizados

- `generatedByAi` é pouco adequado para o workflow definido, porque a IA gera
  conteúdo em torno do ranking, não necessariamente o ranking inteiro.

#### Campos Ausentes

- `slug` ou identificador interno idempotente.
- `category`.
- `subCategory`.
- status `approved`.
- notas editoriais internas.
- critérios de avaliação.
- público-alvo/intenção da página.
- versão ou snapshot.
- autor/revisor.
- data de aprovação.

#### Análise Específica

```text
title: obrigatório, suportado
slug: recomendado, ausente
category: obrigatório para ranking antes da Page, ausente
subCategory: recomendado/obrigatório quando aplicável, ausente
status editorial: parcialmente suportado
notes: recomendado, ausente
pros: pertence ao RankingItem, suportado em RankingItem
cons: pertence ao RankingItem, suportado em RankingItem
highlights: pertence ao RankingItem, suportado como singular highlight
```

#### Obrigatório, Recomendado e Opcional

Obrigatório para o workflow completo:

- `category`;
- `subCategory` quando o ranking nasce antes da `Page`;
- status ou etapa de aprovação formal;
- identificador idempotente ou slug interno.

Recomendado:

- notas editoriais;
- critérios de avaliação;
- intenção de busca;
- versão/snapshot.

Opcional:

- campos de workflow avançado como owner, assignee ou deadline.

#### Avaliação

Insuficiente para o workflow completo. É o maior GAP da modelagem atual.

### RankingItem

#### Campos Atuais

- `position`
- `title`
- `summary`
- `pros`
- `cons`
- `highlight`
- `score`
- `ctaText`
- `status`
- `ranking`
- `product`
- `affiliateLink`

#### Campos Utilizados no Workflow

- `position`: ordenação.
- `product`: produto ranqueado.
- `affiliateLink`: CTA.
- `summary`: justificativa textual.
- `pros`, `cons`: análise editorial.
- `highlight`: destaque.
- `score`: nota.
- `ctaText`: botão.
- `status`: active/inactive.

#### Campos Não Utilizados

Nenhum campo claramente sobrando.

#### Campos Ausentes

- notas editoriais internas separadas de `summary`;
- critério/justificativa de score;
- status de revisão por item;
- snapshot de preço no momento da publicação;
- snapshot do produto/link no momento da publicação.

#### Análise Específica

```text
position: obrigatório, suportado
product: obrigatório, suportado
notes: recomendado, ausente
pros: recomendado, suportado
cons: recomendado, suportado
score: recomendado, suportado
highlight: opcional/recomendado, suportado
```

#### Obrigatório, Recomendado e Opcional

Obrigatório:

- `position`;
- `product`;
- `ranking`;
- `affiliateLink` quando o item terá CTA público.

Recomendado:

- `score`;
- `summary`;
- `pros`;
- `cons`;
- `highlight`;
- snapshot de preço/publicação.

Opcional:

- notas internas;
- justificativa detalhada de score;
- flags como melhor geral, melhor custo-benefício.

#### Avaliação

Suficiente para V1. Parcial para workflow maduro por falta de snapshot e revisão
por item.

### Page

#### Campos Atuais

- `title`
- `slug`
- `pageType`
- `status`
- `excerpt`
- `intro`
- `content`
- `conclusion`
- `canonicalUrl`
- `featuredImage`
- `category`
- `subCategory`
- `seo`
- `ranking`
- `faqs`
- `relatedPages`

#### Campos Utilizados no Workflow

- `title`, `slug`, `pageType`: identidade pública.
- `status`: publicação.
- `excerpt`, `intro`, `content`, `conclusion`: conteúdo final.
- `canonicalUrl`: SEO.
- `featuredImage`: visual.
- `category`, `subCategory`: URL/contexto.
- `seo`, `ranking`, `faqs`, `relatedPages`: relações públicas.

#### Campos Não Utilizados

Nenhum campo claramente desnecessário.

#### Campos Ausentes

- `publishedAt` explícito.
- status `approved`.
- estado `aiGenerated` ou equivalente.
- data de aprovação.
- revisor/aprovador.
- motivo de arquivamento.
- checklist de publicação.
- versão de conteúdo.

#### Análise de Estados

```text
draft: suporta
review: suporta
approved: não suporta
published: suporta
archived: suporta
```

#### Avaliação

Parcial. Suporta publicação básica, mas não suporta integralmente o ciclo
`Draft -> AI Generated -> Under Review -> Approved -> Published -> Archived`
definido nos documentos.

### Seo

#### Campos Atuais

- `metaTitle`
- `metaDescription`
- `canonicalUrl`
- `ogTitle`
- `ogDescription`
- `ogImage`
- `robots`
- `schemaType`
- `schemaData`
- `focusKeyword`
- `secondaryKeywords`
- `page`

#### Campos Utilizados no Workflow

- meta title;
- meta description;
- canonical;
- Open Graph;
- robots;
- schema;
- palavras-chave;
- relação com `Page`.

#### Campos Não Utilizados

Nenhum campo claramente desnecessário.

#### Campos Ausentes

- status de revisão/aprovação do SEO;
- indicação se foi gerado por IA;
- relação direta com `AiGenerationLog`;
- data de aprovação SEO;
- auditor/revisor.

#### Análise Específica

```text
meta title: suporta
meta description: suporta
canonical: suporta
open graph: suporta
robots: suporta
```

#### Avaliação

Suficiente para SEO público básico. Parcial para workflow editorial com IA e
aprovação.

### Faq

#### Campos Atuais

- `question`
- `answer`
- `order`
- `status`
- `page`

#### Campos Utilizados no Workflow

- `question`, `answer`: conteúdo.
- `order`: ordenação.
- `status`: ativo/inativo.
- `page`: relação pública.

#### Campos Não Utilizados

Nenhum campo claramente desnecessário.

#### Campos Ausentes

- `generatedByAi`;
- status `review` ou `approved`;
- relação com `AiGenerationLog`;
- revisor/aprovador;
- data de aprovação;
- motivo de inativação.

#### Análise Específica

```text
generated by AI: não suporta diretamente
approved by editor: não suporta diretamente
published: suporta indiretamente com status active + Page published
```

#### Avaliação

Insuficiente para workflow IA completo. Suficiente apenas para FAQ manual simples.

### AiGenerationLog

#### Campos Atuais

- `provider`
- `model`
- `promptType`
- `prompt`
- `inputData`
- `outputData`
- `status`
- `errorMessage`
- `tokensInput`
- `tokensOutput`
- `costEstimate`
- `generatedAt`
- `page`
- `product`
- `ranking`

#### Campos Utilizados no Workflow

- rastrear provider/model;
- armazenar prompt/input/output;
- status de geração/revisão;
- custos/tokens;
- relação com Page/Product/Ranking.

#### Campos Não Utilizados

Nenhum campo claramente desnecessário.

#### Campos Ausentes

- seção alvo do conteúdo, como intro, FAQ, SEO, conclusion;
- flag de conteúdo aplicado;
- data de aplicação;
- usuário que aplicou/aprovou;
- versão do prompt;
- hash ou assinatura do input;
- relação direta com `Faq` ou `Seo`.

#### Avaliação

Boa base para AI Generator. Parcial para rastrear aplicação granular do conteúdo
gerado.

### ClickEvent

#### Campos Atuais

- `eventType`
- `sourcePageUrl`
- `sourcePageTitle`
- `userAgent`
- `referrer`
- `ipHash`
- `clickedAt`
- `page`
- `product`
- `affiliateLink`
- `marketplace`

#### Campos Utilizados no Workflow

- analytics de clique;
- CTR por produto/página/link;
- rastreamento sem IP puro;
- suporte a decisões editoriais futuras.

#### Campos Não Utilizados

Nenhum campo estrutural desnecessário.

#### Campos Ausentes

- session hash;
- device type;
- ranking position no momento do clique;
- event source/component;
- campaign/source metadata.

#### Avaliação

Suficiente para analytics básico. Parcial para analytics editorial avançado.

## 4. GAPs Encontrados

### GAP 1: Ranking Não Tem Contexto Editorial Persistido

O workflow define que o `Ranking` pode existir antes da `Page`. Porém o schema
atual não tem:

- `slug`;
- `category`;
- `subCategory`;
- intenção de busca;
- critérios editoriais;
- notas internas.

Impacto:

- Ranking Builder precisa carregar contexto fora do ranking.
- AI Generator não tem uma fonte única para contexto.
- Publication Workflow não consegue criar Page draft de forma confiável só a
  partir do Ranking.

### GAP 2: Estado Approved Não Existe em Page/Ranking

O workflow define:

```text
Draft
AI Generated
Under Review
Approved
Published
Archived
```

Mas `Page` e `Ranking` possuem:

```text
draft
review
published
archived
```

Impacto:

- não há etapa formal entre revisão e publicação;
- publicação pode virar uma ação editorial ambígua;
- plugins futuros precisam simular aprovação fora do schema.

### GAP 3: Page Não Tem publishedAt Explícito

A documentação original previa `publishedAt`, mas o schema atual de `Page` não
possui esse campo.

Impacto:

- sitemap e auditoria dependem de timestamps genéricos;
- não há data editorial explícita de publicação;
- re-publicações ficam menos claras.

### GAP 4: FAQ Não Suporta Revisão de IA

`Faq` só tem `active` e `inactive`.

Impacto:

- FAQ gerada por IA não consegue ficar em `review`;
- aprovação editorial não fica rastreável;
- AI Generator precisa aplicar FAQ diretamente ou usar logs externos.

### GAP 5: SEO Não Tem Status Editorial

`Seo` suporta campos técnicos, mas não aprovação.

Impacto:

- não há como saber se SEO gerado por IA foi aprovado;
- Publication Workflow não consegue validar SEO aprovado sem regra externa.

### GAP 6: Product Não Tem Estoque/Disponibilidade

`Product` tem preço, status editorial e `soldQuantity`, mas não tem estoque ou
disponibilidade.

Impacto:

- não há reação precisa para produto fora de estoque;
- ranking publicado pode continuar recomendando item indisponível;
- atualização futura fica dependente de heurística.

### GAP 7: RankingItem Não Tem Snapshot

`RankingItem` aponta para `Product` e `AffiliateLink`, mas não guarda snapshot
da recomendação no momento da publicação.

Impacto:

- mudanças de preço/produto podem alterar retroativamente a interpretação do
ranking;
- analytics histórico por posição fica frágil;
- não há registro do preço ou CTA no momento em que a página foi publicada.

### GAP 8: AiGenerationLog Não Rastreia Aplicação Granular

O log armazena input/output, mas não indica qual parte foi aplicada.

Impacto:

- difícil saber se intro, FAQ, SEO ou conclusion vieram de uma geração;
- re-geração seletiva fica menos auditável.

## 5. Mudanças Obrigatórias

Estas mudanças são obrigatórias se o objetivo for implementar com segurança:

```text
Ranking
↓
AI
↓
Page
↓
SEO
↓
Publicação
```

### 1. Persistir Contexto Editorial no Ranking

Adicionar ao `Ranking`:

- `slug` ou `internalSlug`;
- `category`;
- `subCategory`;
- `editorialNotes` ou `notes`;
- `searchIntent` ou `targetIntent`;
- `evaluationCriteria` como json ou text.

Motivo:

O ranking precisa existir antes da `Page` e precisa ser suficiente para alimentar
o AI Generator e o Publication Workflow.

### 2. Adicionar Estado Approved ou Campo Equivalente

Opções:

- adicionar `approved` aos enums de `Ranking.status` e `Page.status`;
- ou adicionar campos como `approvedAt`/`approvedBy` e manter status atual.

Recomendação:

```text
Adicionar approved aos status editoriais de Ranking e Page.
```

Motivo:

Separar revisão concluída de publicação.

### 3. Adicionar publishedAt em Page

Adicionar:

- `publishedAt: datetime`

Motivo:

Sitemap, auditoria, atualização e lifecycle editorial precisam de data pública
explícita.

### 4. Adicionar Controle Editorial de FAQ

Opção mínima:

- expandir `Faq.status` para `draft`, `review`, `approved`, `active`,
  `inactive`.

Opção alternativa:

- manter `active/inactive` e adicionar `approvedAt`, `generatedByAi`.

Recomendação:

```text
Adicionar generatedByAi e status editorial mais completo.
```

### 5. Adicionar Disponibilidade em Product

Adicionar pelo menos:

- `availabilityStatus` ou `stockStatus`;
- `availableQuantity` se a fonte permitir;
- `lastAvailabilityCheckedAt`.

Motivo:

Suportar atualização quando produto sai de estoque ou é removido.

## 6. Mudanças Recomendadas

### Ranking

- `version`;
- `approvedAt`;
- `reviewedBy` ou relação futura com usuário/admin;
- `sourceNotes`;
- `targetAudience`;
- `qualityChecklist`.

### RankingItem

- `scoreReason`;
- `internalNotes`;
- `priceSnapshot`;
- `affiliateUrlSnapshot`;
- `productNameSnapshot`;
- `publishedAtSnapshot`.

### Seo

- `status`: draft, review, approved;
- `generatedByAi`;
- `approvedAt`;
- relação com `AiGenerationLog`.

### AiGenerationLog

- `targetSection`;
- `appliedAt`;
- `appliedBy`;
- `isApplied`;
- `promptVersion`;
- relação opcional com `Seo` e `Faq`.

### AffiliateLink

- `lastHttpStatus`;
- `brokenReason`;
- `priority`;
- `campaignName`;
- `expiresAt`.

### ClickEvent

- `rankingPosition`;
- `component`;
- `sessionHash`;
- `deviceType`.

## 7. Mudanças Opcionais

Estas não bloqueiam o fluxo, mas aumentam maturidade:

- SEO próprio para `Category` e `SubCategory`.
- Guidelines editoriais por categoria.
- Critérios mínimos por categoria/subcategoria.
- Entidade separada para checklist de publicação.
- Entidade de versionamento de ranking.
- Histórico de preço.
- Histórico de disponibilidade.
- Workflow de archive com motivo.

## 8. Riscos de Não Alterar

### Risco 1: AI Generator Sem Contexto Suficiente

Sem categoria, subcategoria, intenção e critérios no `Ranking`, a IA dependerá
de payload montado ad hoc pelos serviços.

Consequência:

- prompts inconsistentes;
- baixa rastreabilidade;
- maior chance de conteúdo genérico.

### Risco 2: Publicação Sem Aprovação Formal

Sem `approved`, `review` pode virar um estado ambíguo.

Consequência:

- conteúdo pode ir para `published` sem gate editorial claro.

### Risco 3: Páginas Publicadas Com Produto Indisponível

Sem disponibilidade de produto, a atualização fica cega.

Consequência:

- ranking público pode recomendar produto fora de estoque ou removido.

### Risco 4: SEO e FAQ Gerados Sem Auditoria Clara

Sem status editorial ou vínculo granular com IA:

- difícil saber o que foi gerado;
- difícil saber o que foi aprovado;
- difícil regenerar só uma seção.

### Risco 5: Histórico Editorial Frágil

Sem snapshot/versionamento:

- alterações futuras podem mudar a leitura histórica de rankings;
- analytics por posição perde precisão.

## 9. Plano Recomendado

### Etapa 1: Corrigir GAPs Obrigatórios

Antes do AI Generator:

1. enriquecer `Ranking` com contexto editorial;
2. formalizar aprovação em `Ranking` e `Page`;
3. adicionar `publishedAt` em `Page`;
4. adicionar disponibilidade em `Product`;
5. adicionar controle editorial básico em `Faq`;
6. adicionar status/aprovação em `Seo` ou equivalente.

### Etapa 2: Ajustar Ranking Builder

Depois das mudanças:

- salvar `category` e `subCategory` no ranking;
- usar `slug`/identificador interno para idempotência;
- persistir critérios editoriais;
- preparar payload consistente para AI Generator.

### Etapa 3: Implementar AI Generator

Somente após Etapa 1:

- gerar conteúdo com base em `Ranking` persistido;
- salvar `AiGenerationLog`;
- criar/aplicar rascunhos em `Page`, `Seo` e `Faq`;
- não publicar automaticamente.

### Etapa 4: Implementar Publication Workflow

- validar checklist;
- validar SEO aprovado;
- validar ranking aprovado;
- validar produto/link disponível;
- publicar `Page`;
- atualizar sitemap.

### Etapa 5: Analytics Editorial

- enriquecer `ClickEvent`;
- analisar CTR por posição;
- sinalizar produtos para revisão;
- alimentar futuras atualizações de ranking.

## 10. Impacto Futuro por Módulo

### Mercado Livre

Impacto:

- precisa popular disponibilidade e atualização de produto;
- deve manter `AffiliateLink.status` confiável;
- ganha base melhor para alertar produto removido ou fora de estoque.

### Ranking Builder

Impacto:

- deixa de depender de contexto solto no payload;
- passa a criar ranking editorial completo;
- ganha idempotência mais segura com slug/internalSlug.

### AI Generator

Impacto:

- terá fonte única e confiável no `Ranking`;
- poderá gerar Page draft com menos montagem manual;
- poderá rastrear aplicação de conteúdo com mais precisão.

### Publication Workflow

Impacto:

- consegue validar aprovação formal;
- consegue bloquear publicação por produto indisponível;
- consegue exigir SEO/FAQ aprovados.

### Analytics

Impacto:

- melhora leitura de performance por ranking e posição;
- snapshots tornam análise histórica mais confiável.

## 11. Resposta Final

Resposta definitiva:

```text
A modelagem atual NÃO está pronta integralmente para:

Ranking
↓
AI
↓
Page
↓
SEO
↓
Publicação
```

Ela está pronta para:

```text
Product
↓
Ranking
↓
RankingItem
```

Ela não está pronta para o fluxo completo porque ainda faltam:

- contexto editorial persistido no `Ranking`;
- aprovação formal em `Ranking` e `Page`;
- data explícita de publicação em `Page`;
- disponibilidade/estoque em `Product`;
- aprovação/rastreabilidade de `Faq`;
- aprovação/rastreabilidade de `Seo`;
- aplicação granular de `AiGenerationLog`;
- snapshots ou versionamento para rankings publicados.

Recomendação:

```text
Corrigir os GAPs obrigatórios agora, antes do AI Generator.
```

Como o banco ainda está praticamente vazio, o impacto de ajuste estrutural é
baixo neste momento e tende a ficar muito mais caro depois que rankings, páginas
e conteúdo gerado por IA começarem a existir.
