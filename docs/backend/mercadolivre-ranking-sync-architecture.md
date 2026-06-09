# Mercado Livre Ranking Sync Architecture

## Official Flow

Guide to Findings is now operated through one Strapi Admin entrypoint:

```text
Gerador de Rankings
-> term
-> Mercado Livre category resolver
-> Category/SubCategory local sync
-> Mercado Livre /highlights
-> ranking enrichment
-> MarketplaceRanking/MarketplaceRankingEntry
-> Product/AffiliateLink
-> Ranking/RankingItem
-> Editorial Plan
-> Page Reuse Engine
-> AI Generator
-> Publication Workflow
-> Page published or requires review
```

The frontend public contract remains:

```text
Page
-> Ranking
-> RankingItem
```

`MarketplaceRanking` and `MarketplaceRankingEntry` stay private and technical.
They are not a second public ranking layer.

## Editorial Intelligence

The Mercado Livre pipeline now builds a deterministic `editorialPlan` before
the AI Generator step.

The plan separates the product source from the public search intent:

```text
Mercado Livre
-> source for product discovery, highlights, prices and affiliate links

Editorial Plan
-> public title hint, slug hint, focus keyword and SEO/GEO constraints
```

This keeps Mercado Livre traceability without forcing the public title or slug
to include `Mercado Livre`. For example, the source can remain Mercado Livre
while the public-facing plan suggests:

```text
titleHint: Os 10 melhores notebooks para comprar
slugHint: melhores-notebooks
sourceDisclosure: Produtos selecionados com base em rankings e dados disponíveis no Mercado Livre.
```

The AI Generator receives this plan and uses it to guide public title, slug,
SEO, FAQ, source disclosure and JSON-LD quantity.

## Page Reuse Engine

Before running AI, the pipeline checks whether the current editorial intent
already has a reusable Page:

```text
Editorial Plan
-> Page Reuse Engine
-> AI Generator
```

Search order:

- Ranking already linked to a Page;
- exact `editorialPlan.slugHint`;
- equivalent normalized editorial term for best-list intents.

If the engine finds a published Page, the pipeline returns it with
`pageReuse.action = reuse-published`, skips AI, skips Seo/Faq creation and does
not call the Publication Workflow. Draft and review Pages are returned for
review with `reuse-draft` or `reuse-review`, also without creating duplicates.

Cost-benefit and comparison intents are intentionally not merged into generic
`melhores-*` pages yet. They need the future Editorial Intent Engine to decide
when pages such as `melhores-notebooks` and
`melhores-notebooks-custo-beneficio` should remain separate.

## Admin

The only routine operator screen is `Gerador de Rankings`.

The operator sends a product term such as:

```text
furadeira
notebook
mamadeira
air fryer
```

The admin calls:

```text
POST /api/internal/marketplaces/mercado-livre/ranking-chat
```

If all validations pass, the Page is approved and published. If any validation
fails, the Page remains draft and the response returns `requiresReview: true`.

## Review Exceptions

`Revisoes Necessarias` remains available for generated Pages that need manual
review. It reuses the existing Publication Workflow service and validations.

This is not the default content creation path; it is an exception queue.

## Idempotency

Logical keys:

- `MarketplaceRanking`: `marketplace + siteId + externalCategoryId`
- `MarketplaceRankingEntry`: `marketplaceRanking + sourceId`
- `Product`: `marketplaceProductId`
- `AffiliateLink`: `product + marketplace`
- `Ranking`: `MarketplaceRanking.editorialRanking`
- `RankingItem`: `Ranking + Product`
- `Category` and `SubCategory`: `slug`

Running the same term repeatedly updates existing records instead of
duplicating the pipeline output.

## Manual Commands

Only two smoke-test commands remain:

```bash
yarn sync:ml:term "furadeira"
yarn sync:ml:publish "furadeira"
```

They exist for operational validation and local debugging, not as separate
product flows.

## Removed Legacy Flows

The following flows are no longer part of the architecture:

- manual Mercado Livre search/import admin;
- manual Ranking Builder admin;
- manual AI Generator admin by `rankingId`;
- generic mobile/user/profile/notification/support APIs;
- generic CSV/Excel/download APIs;
- discovery scripts used during Mercado Livre endpoint validation.

## Current Limits

- There is no Mercado Livre cron.
- Internal endpoints still use the existing internal-route auth posture and
  should receive production policies before external exposure.
- `soldQuantity` is usually unavailable from the current enrichment path.
