# Mercado Livre Admin Tool

Administrative tool for Mercado Livre search and import inside Strapi Admin.

The V1 admin screen is registered in the Strapi Admin menu as "Mercado Livre"
and lives in:

```text
src/admin/admin/MercadoLivrePage/
src/admin/app.js
```

The working integration remains in:

```text
src/services/marketplaces/mercado-livre/
src/api/mercado-livre/
```

The admin screen calls the internal Strapi endpoints and does not call Mercado
Livre directly from the browser:

```text
POST /api/internal/marketplaces/mercado-livre/search
POST /api/internal/marketplaces/mercado-livre/import
```

Future plugin work should keep reusing the existing service layer for search,
normalization and idempotent import.
