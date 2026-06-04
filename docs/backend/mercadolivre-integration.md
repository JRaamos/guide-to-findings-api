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

Do not commit real credentials.

The current implementation uses `MERCADO_LIVRE_CLIENT_ID` and
`MERCADO_LIVRE_CLIENT_SECRET` to request an application access token with
`grant_type=client_credentials`. Tokens are cached in memory and sent through
the `Authorization: Bearer` header.

## Mercado Livre Endpoints Used

Search products:

```text
GET /sites/{siteId}/search?q={query}
```

The integration first tries this listings endpoint because it returns the
closest marketplace listing payload. In the current Mercado Livre behavior this
endpoint can return `403 Forbidden` even with a valid token, depending on the
application/resource permissions. When that happens, the backend falls back to
official catalog resources:

```text
GET /products/search?status=active&site_id={siteId}&q={query}
GET /products/{productId}/items
```

This fallback returns catalog products and a related offer when available. It is
enough for the local import workflow, but it is not an affiliate or storefront
integration.

Parameters:

- `siteId`: from `MERCADO_LIVRE_SITE_ID`, default `MLB`
- `q`: search term
- `limit`: optional result limit
- `category`: optional Mercado Livre category id

## Search Flow

1. Internal API receives `query`, optional `limit`, and optional `categoryId`.
2. Backend gets an application token and calls Mercado Livre using
   `MERCADO_LIVRE_BASE_URL`.
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

- The `/sites/{siteId}/search` endpoint can still be blocked by Mercado Livre
  with `403`; the backend uses the catalog fallback in this case.
- Affiliate URL generation is not implemented.
- `affiliateUrl` is temporarily equal to the normalized Mercado Livre URL.
- Search uses Mercado Livre catalog/listing data only.
- No ranking is created automatically.
- No page is published automatically.
- No AI summary or SEO content is generated.

## Next Steps

- Implement Mercado Livre OAuth where needed.
- Validate the official affiliate flow and replace temporary affiliate URLs.
- Add assisted ranking creation from imported products.
- Add AI-assisted product summaries and ranking copy.
- Add review workflows before product approval.
