# Ranking Builder Admin Tool

Administrative architecture folder for the Ranking Builder.

The V1 implementation does not create a Strapi Admin plugin or UI yet. It
defines internal endpoints and reusable backend services for:

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
- list rankings;
- retrieve one ranking;
- keep Page, SEO, FAQ, AI and publication out of this module.
