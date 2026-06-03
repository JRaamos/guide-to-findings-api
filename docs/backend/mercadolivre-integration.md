# Mercado Livre Integration

## Objective

This integration provides the first backend flow for searching Mercado Livre products and importing selected products into the existing Guide to Findings content types.

It does not create pages, rankings, affiliate URLs, or AI content automatically.

## Environment Variables

```env
MERCADO_LIVRE_CLIENT_ID=
MERCADO_LIVRE_CLIENT_SECRET=
MERCADO_LIVRE_BASE_URL=https://api.mercadolibre.com
MERCADO_LIVRE_SITE_ID=MLB
```

Do not commit real credentials. The first version uses public search endpoints and does not implement OAuth.

## Mercado Livre Endpoints Used

Search products:

```text
GET /sites/{siteId}/search?q={query}
```

Parameters:

- `siteId`: from `MERCADO_LIVRE_SITE_ID`, default `MLB`
- `q`: search term
- `limit`: optional result limit
- `category`: optional Mercado Livre category id

## Search Flow

1. Internal API receives `query`, optional `limit`, and optional `categoryId`.
2. Backend calls Mercado Livre search endpoint using `MERCADO_LIVRE_BASE_URL`.
3. Raw Mercado Livre items are normalized.
4. Internal endpoint returns a compact payload, not the full Mercado Livre response.

Normalized products include:

- `marketplaceProductId`
- `title`
- `permalink`
- `thumbnail`
- `price`
- `originalPrice`
- `currency`
- `condition`
- `availableQuantity`
- `soldQuantity`
- `categoryId`
- `sellerId`
- `attributes`
- `brand`
- `model`

## Import Flow

1. Internal API receives local `categoryId`, local `subCategoryId`, and selected normalized products.
2. Backend ensures the `Mercado Livre` marketplace exists.
3. Each selected product is created or updated in `Product`.
4. Each product receives or updates one `AffiliateLink`.
5. Imported products are saved with `status = imported`.

## Idempotency

Products are identified by:

```text
marketplaceProductId
```

Affiliate links are identified by product and marketplace. The same import can run multiple times without duplicating products or affiliate links.

## Imported Product Status

Imported products are saved as:

```text
status = imported
```

This keeps imported products separate from manually reviewed and approved products.

## Current Limitations

- OAuth is not implemented.
- Affiliate URL generation is not implemented.
- `affiliateUrl` is temporarily equal to Mercado Livre `permalink`.
- Search uses Mercado Livre public search data only.
- No ranking is created automatically.
- No page is published automatically.
- No AI summary or SEO content is generated.

## Next Steps

- Implement Mercado Livre OAuth where needed.
- Validate the official affiliate flow and replace temporary affiliate URLs.
- Add assisted ranking creation from imported products.
- Add AI-assisted product summaries and ranking copy.
- Add review workflows before product approval.
