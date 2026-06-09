# API Endpoints And Contracts

## Official Internal Flow

The operational admin entrypoint is the ranking generator chat.

```text
POST /api/internal/marketplaces/mercado-livre/ranking-chat
```

Payload:

```json
{
  "term": "furadeira",
  "autoPublish": true
}
```

The endpoint runs the official pipeline:

```text
term
-> Mercado Livre category resolver
-> local Category/SubCategory
-> Mercado Livre highlights
-> MarketplaceRanking/MarketplaceRankingEntry
-> Product/AffiliateLink
-> Ranking/RankingItem
-> AI Generator
-> Publication Workflow
-> Page published or requires review
```

Response:

```json
{
  "success": true,
  "term": "furadeira",
  "rankingId": 12,
  "pageId": 12,
  "published": true,
  "requiresReview": false,
  "publicUrl": "/ferramentas/ranking-das-10-furadeiras-mais-vendidas-no-mercado-livre",
  "operatorStatus": "published",
  "operatorSummary": "Ranking publicado para \"furadeira\".",
  "validationErrors": [],
  "warnings": []
}
```

## Internal Review Flow

Pages that fail automatic publication remain draft and must be reviewed through:

```text
GET  /api/internal/publication/pages
GET  /api/internal/publication/pages/:id
PUT  /api/internal/publication/pages/:id
POST /api/internal/publication/pages/:id/approve
POST /api/internal/publication/pages/:id/publish
```

These endpoints remain the only manual publication path and must keep using the
existing Publication Workflow validations.

## Public API

The frontend public contract remains unchanged:

```text
GET  /api/public/categories
GET  /api/public/categories/:categorySlug
GET  /api/public/pages/:categorySlug/:contentSlug
GET  /api/public/sitemap
POST /api/public/click-events
```

Only published pages are returned by public page and sitemap endpoints.

## Removed Internal Flows

The following manual flows are no longer official contracts:

- manual Mercado Livre search/import;
- manual Ranking Builder creation;
- manual AI generation by `rankingId`;
- generic CSV/Excel/download utilities;
- mobile/profile/notification/support APIs.
