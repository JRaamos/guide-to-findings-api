# Mercado Livre Admin Workflow

## Objective

Define the expected future workflow for the Mercado Livre administrative tool
inside Strapi Admin.

This is an architecture document only. It does not create a plugin, change
schemas, change endpoints or alter the current integration.

## Flow

```text
Buscar produto
↓
Selecionar produtos
↓
Importar
↓
Product
↓
Ranking
↓
Page
↓
Publicação
```

## Detailed Steps

### 1. Buscar produto

The Strapi Admin tool will receive a search term and call the existing Mercado
Livre search service. The service is responsible for authentication, upstream
fallbacks and normalized product payloads.

Existing files:

```text
src/services/marketplaces/mercado-livre/client.js
src/services/marketplaces/mercado-livre/search.js
src/services/marketplaces/mercado-livre/normalize-product.js
```

### 2. Selecionar produtos

The administrator selects normalized products in the Strapi Admin UI. Selection
state belongs to the future admin plugin UI, not to public Next.js routes.

### 3. Importar

The selected products are passed to the current import service. The service must
remain idempotent and avoid duplicate `Product`, `AffiliateLink` and
`Marketplace` records.

Existing file:

```text
src/services/marketplaces/mercado-livre/import-products.js
```

### 4. Product

Imported products enter Strapi as `Product` records with `status = imported`.
Editors can review product data, enrich fields and decide whether the product
becomes eligible for ranking.

### 5. Ranking

Approved products can be used by Ranking Builder to create `Ranking` and
`RankingItem` records. This step is editorial and should not be automatically
published by the Mercado Livre import tool.

### 6. Page

A ranking can be attached to a `Page` with page type `ranking`. SEO, FAQs,
intro, conclusion and related pages remain managed by Strapi content workflows.

### 7. Publicação

Publication happens only when the related records are reviewed and the `Page`
status is set to `published`. The public frontend continues to consume the
public page endpoint and render dynamic templates.

## Current Bridge

Current internal endpoints remain available:

```text
POST /api/internal/marketplaces/mercado-livre/search
POST /api/internal/marketplaces/mercado-livre/import
```

They are not public site features. In the future Strapi Admin plugin, these can
be replaced by direct service calls or kept temporarily as an internal bridge.

## Legacy Frontend Screen

The current Next.js route is legacy:

```text
/admin/mercado-livre
```

It should not receive new administrative functionality. The next implementation
phase should build the Mercado Livre tool inside Strapi Admin.

