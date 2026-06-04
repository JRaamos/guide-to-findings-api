# Admin Architecture

## Official Direction

The administrative architecture for Guide to Findings is:

```text
Strapi = Administration
Next.js = Public Site
```

Next.js is responsible for public rendering, SEO routes, dynamic templates and
visitor interactions. Operational tools must live in the Strapi administrative
environment, where editors and operators already manage content, review records
and control publication state.

## Target Structure

```text
Strapi Admin
├── Mercado Livre
├── Ranking Builder
├── AI Generator
└── Publication Workflow
```

This document defines the future administrative boundary. It does not introduce
a Strapi plugin yet and does not change backend endpoints, schemas or public
contracts.

## Responsibilities

### Mercado Livre

The Mercado Livre tool will let an administrator search marketplace data,
select products, import products into Strapi and prepare imported records for
review. It will reuse the existing backend integration services instead of
duplicating marketplace calls in the admin UI.

### Ranking Builder

The Ranking Builder will help assemble `Ranking` and `RankingItem` records from
approved products. It will support editorial ordering, highlights, pros, cons,
scores and CTA configuration before a page is published.

### AI Generator

The AI Generator will support assisted drafts for SEO, product summaries, FAQs,
ranking descriptions and article sections. Generated output must be stored for
review and approval, not published automatically.

### Publication Workflow

The Publication Workflow will coordinate statuses across `Product`, `Ranking`,
`Page`, `Seo` and related records. It should make draft, review and publication
states explicit for editors before content becomes publicly available.

## Backend Assets Reused By Admin Tools

### Mercado Livre Integration

Current files:

```text
src/services/marketplaces/mercado-livre/client.js
src/services/marketplaces/mercado-livre/search.js
src/services/marketplaces/mercado-livre/import-products.js
src/services/marketplaces/mercado-livre/normalize-product.js
src/api/mercado-livre/controllers/mercado-livre.js
src/api/mercado-livre/routes/mercado-livre.js
src/api/mercado-livre/services/mercado-livre.js
```

Future Strapi Admin usage:

- `client.js`: authenticated Mercado Livre API client and upstream error
  handling.
- `search.js`: search orchestration and fallback from listings to catalog
  products.
- `normalize-product.js`: mapping Mercado Livre payloads to the internal import
  contract.
- `import-products.js`: idempotent persistence into `Product`, `AffiliateLink`
  and `Marketplace`.
- `controllers`, `routes`, `services`: temporary internal API bridge. The future
  admin plugin can call the same service layer directly or preserve internal
  routes while the migration is gradual.

## Frontend Legacy Boundary

The current Next.js route below is legacy:

```text
/admin/mercado-livre
```

It remains available temporarily to avoid a disruptive removal, but it is no
longer the target architecture. New administrative tools must be planned for
Strapi Admin.

## Non-goals For This Phase

- Do not create a Strapi plugin yet.
- Do not create final admin UI.
- Do not change content types.
- Do not change public endpoints.
- Do not change Mercado Livre integration behavior.
- Do not move ranking, SEO, AI or publication logic.

## Migration Plan

1. Keep the existing backend Mercado Livre services stable.
2. Mark the Next.js admin screen as legacy.
3. Define `src/admin-tools` as the future backend/admin planning area.
4. Build a Strapi Admin plugin for Mercado Livre in the next phase.
5. Move the operational UI from Next.js to Strapi Admin.
6. After the Strapi tool is validated, remove the legacy Next.js admin route.

