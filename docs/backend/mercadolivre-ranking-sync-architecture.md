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
free text term
-> Mercado Livre category resolver
-> Mercado Livre /highlights
-> marketplace ranking enrichment
-> MarketplaceRanking
-> MarketplaceRankingEntry
-> Product / AffiliateLink
-> Ranking / RankingItem
```

The lower-level category-id flow is still available for debugging and targeted
syncs:

```text
Mercado Livre /highlights
-> marketplace ranking enrichment
-> MarketplaceRanking
-> MarketplaceRankingEntry
-> Product / AffiliateLink
-> Ranking / RankingItem
```

## First Persistence

The first implemented persistence stores only:

- `MarketplaceRanking`: technical source and sync summary for one Mercado Livre
  ranking category.
- `MarketplaceRankingEntry`: technical state for each returned position/source
  item.

The technical sync intentionally does not create:
- `Page`
- `Seo`
- `Faq`

## Idempotency

Logical keys:

- `MarketplaceRanking`: `marketplace + siteId + externalCategoryId`
- `MarketplaceRankingEntry`: `marketplaceRanking + sourceId`
- `Product`: `marketplaceProductId`
- `AffiliateLink`: `product + marketplace`
- `Ranking`: `MarketplaceRanking.editorialRanking`
- `RankingItem`: `Ranking + Product`

Running the manual sync repeatedly updates the same technical records instead
of duplicating them.

## Manual Command

```bash
yarn sync:ml:ranking MLB188785
```

The command calls the private sync service and prints the sync summary plus
before/after counts for public models to confirm that `Product`, `Ranking` and
`Page` were not created.

## Term Orchestrator

```bash
yarn sync:ml:term "furadeira"
```

This command resolves a free text term to a Mercado Livre category using
`domain_discovery`, validates that the category has enough `/highlights`, then
runs the existing technical sync, product bridge and editorial ranking bridge.

It stops at draft `Ranking` and `RankingItem`. It does not create `Page`, `Seo`
or `Faq`, and it does not call the AI generator or publication workflow.

If enrichment returns fewer than 10 publishable products, the command stops
before the product and editorial bridges. The technical `MarketplaceRanking`
state can still exist for auditing and debugging.

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

## Editorial Ranking Bridge

```bash
yarn sync:ml:ranking-editorial MLB188785
```

This command reads active/publishable `MarketplaceRankingEntry` records that are
already linked to `Product`, then creates or updates one draft editorial
`Ranking` and its `RankingItem` records.

It reuses the existing editorial models and does not create `Page`, `Seo` or
`Faq`. It also does not call the AI generator or publication workflow. Existing
ranking item editorial text is preserved when positions are refreshed.

## Current Limits

- There is no cron.
- There is no public endpoint.
- There is no admin UI.
- There is no bridge to `Page`.
- `soldQuantity` is usually unavailable from the current enrichment path.

## Next Phase

The next phase should call the existing AI Generator for a draft `Ranking`
selected by the editor. It should still avoid automatic publication.
