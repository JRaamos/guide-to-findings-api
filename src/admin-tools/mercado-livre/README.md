# Gerador de Rankings Admin Tool

Official Strapi Admin entrypoint for the Mercado Livre ranking pipeline.

The admin screen lives in:

```text
src/admin/admin/MercadoLivrePage/
src/admin/app.js
```

It calls one internal backend endpoint:

```text
POST /api/internal/marketplaces/mercado-livre/ranking-chat
```

The endpoint runs:

```text
term
-> Mercado Livre category resolver
-> local Category/SubCategory
-> MarketplaceRanking/MarketplaceRankingEntry
-> Product/AffiliateLink
-> Ranking/RankingItem
-> AI Generator
-> Publication Workflow
-> Page published or requires review
```

Manual search/import and manual ranking creation are not official admin flows.
