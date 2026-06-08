# Mercado Livre Ranking Sync Architecture

## Objective

This document records the first technical persistence layer for Mercado Livre
ranking synchronization. The layer is private and does not publish content.

Public editorial flow remains unchanged:

```text
Page
-> Ranking
-> RankingItem
```

The new private technical flow is:

```text
Mercado Livre /highlights
-> marketplace ranking enrichment
-> MarketplaceRanking
-> MarketplaceRankingEntry
-> Product / AffiliateLink
```

## First Persistence

The first implemented persistence stores only:

- `MarketplaceRanking`: technical source and sync summary for one Mercado Livre
  ranking category.
- `MarketplaceRankingEntry`: technical state for each returned position/source
  item.

The technical sync intentionally does not create:
- `Ranking`
- `RankingItem`
- `Page`
- `Seo`
- `Faq`

## Idempotency

Logical keys:

- `MarketplaceRanking`: `marketplace + siteId + externalCategoryId`
- `MarketplaceRankingEntry`: `marketplaceRanking + sourceId`
- `Product`: `marketplaceProductId`
- `AffiliateLink`: `product + marketplace`

Running the manual sync repeatedly updates the same technical records instead
of duplicating them.

## Manual Command

```bash
yarn sync:ml:ranking MLB188785
```

The command calls the private sync service and prints the sync summary plus
before/after counts for public models to confirm that `Product`, `Ranking` and
`Page` were not created.

## Product / AffiliateLink Bridge

```bash
yarn sync:ml:ranking-products MLB188785
```

This command reads only active/publishable `MarketplaceRankingEntry` records and
reuses the existing Mercado Livre import path to upsert `Product` and
`AffiliateLink`.

It does not create editorial `Ranking`, `RankingItem`, `Page`, `Seo` or `Faq`.
When a product is imported or updated, the technical entry points directly to
the existing `Product` through `MarketplaceRankingEntry.product`.

## Current Limits

- There is no cron.
- There is no public endpoint.
- There is no admin UI.
- There is no bridge to `Ranking` or `Page`.
- `soldQuantity` is usually unavailable from the current enrichment path.

## Next Phase

The next phase should add a controlled bridge from imported `Product` records to
editorial `Ranking` and `RankingItem` records. It should still avoid automatic
publication.
