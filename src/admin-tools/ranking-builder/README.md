# Ranking Builder Admin Tool

Administrative architecture folder for the Ranking Builder.

The V1 implementation adds a Strapi Admin screen registered as "Ranking
Builder" and keeps Page, SEO, FAQ, AI and publication out of this module.

Admin UI:

```text
src/admin/admin/RankingBuilderPage/
src/admin/app.js
```

It uses internal endpoints and reusable backend services for:

```text
Product
↓
Ranking
↓
RankingItem
```

Current backend implementation:

```text
src/services/ranking-builder/
src/api/ranking-builder/
```

V1 scope:

- create rankings from existing products;
- update rankings without duplicating ranking items;
- list products available for ranking;
- list rankings;
- retrieve one ranking;
- keep Page, SEO, FAQ, AI and publication out of this module.

Internal endpoints:

```text
GET  /api/internal/rankings
GET  /api/internal/rankings/products
GET  /api/internal/rankings/:id
POST /api/internal/rankings
PUT  /api/internal/rankings/:id
```
