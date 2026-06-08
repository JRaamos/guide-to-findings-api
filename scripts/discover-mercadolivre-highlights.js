'use strict';

require('dotenv').config();

const client = require('../src/services/marketplaces/mercado-livre/client');
const { normalizeProduct } = require('../src/services/marketplaces/mercado-livre/normalize-product');

const SITE_ID = 'MLB';
const CATEGORY_ID = 'MLB188785';
const HIGHLIGHTS_PATH = `/highlights/${SITE_ID}/category/${CATEGORY_ID}`;
const ENRICHMENT_SAMPLE_LIMIT = 5;

const buildCatalogProductUrl = (productId) => {
  return `https://www.mercadolivre.com.br/p/${productId}`;
};

const isPlainObject = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const valueExists = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== null && value !== undefined && value !== '';
};

const getNestedValue = (source, paths) => {
  for (const path of paths) {
    const value = path.split('.').reduce((current, key) => current?.[key], source);

    if (valueExists(value)) {
      return value;
    }
  }

  return null;
};

const collectFields = (items = []) => {
  return [...new Set(items.flatMap((item) => (isPlainObject(item) ? Object.keys(item) : [])))].sort();
};

const summarizeValue = (value, depth = 0) => {
  if (Array.isArray(value)) {
    return {
      type: 'array',
      length: value.length,
      sample: value.slice(0, 3).map((item) => summarizeValue(item, depth + 1)),
    };
  }

  if (isPlainObject(value)) {
    if (depth >= 2) {
      return {
        type: 'object',
        fields: Object.keys(value).sort(),
      };
    }

    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 20)
        .map(([key, item]) => [key, summarizeValue(item, depth + 1)])
    );
  }

  return value;
};

const findHighlightItems = (payload) => {
  const candidates = [
    ['content', payload?.content],
    ['results', payload?.results],
    ['items', payload?.items],
    ['products', payload?.products],
    ['data.content', payload?.data?.content],
    ['data.results', payload?.data?.results],
  ];
  const found = candidates.find(([, value]) => Array.isArray(value));

  return {
    sourceField: found?.[0] || null,
    items: found?.[1] || [],
  };
};

const normalizeExternalType = (item) => {
  const type = String(item?.type || item?.element_type || item?.externalType || '').toLowerCase();

  if (type.includes('product')) {
    return 'product';
  }

  if (type.includes('item')) {
    return 'item';
  }

  return null;
};

const getExternalId = (item) => {
  return (
    item?.id ||
    item?.item_id ||
    item?.product_id ||
    item?.itemId ||
    item?.productId ||
    item?.externalId ||
    null
  );
};

const getPosition = (item, index) => {
  return item?.position || item?.rank || item?.ranking_position || index + 1;
};

const summarizeHighlightItem = (item, index) => {
  return {
    id: getExternalId(item),
    type: normalizeExternalType(item) || item?.type || null,
    position: getPosition(item, index),
    fields: isPlainObject(item) ? Object.keys(item).sort() : [],
  };
};

const inspectAvailability = (source) => {
  return {
    image: valueExists(
      getNestedValue(source, ['thumbnail', 'image', 'imageUrl', 'picture', 'pictures', 'secure_thumbnail'])
    ),
    price: valueExists(getNestedValue(source, ['price', 'priceSnapshot'])),
    permalink: valueExists(getNestedValue(source, ['permalink', 'url', 'marketplaceUrl'])),
    rating: valueExists(
      getNestedValue(source, ['rating', 'reviews.rating_average', 'ratingSnapshot'])
    ),
    reviewCount: valueExists(
      getNestedValue(source, ['reviewCount', 'reviews.total', 'reviewCountSnapshot'])
    ),
    soldQuantity: valueExists(
      getNestedValue(source, ['soldQuantity', 'sold_quantity', 'soldQuantitySnapshot'])
    ),
  };
};

const countAvailability = (items, inspector) => {
  return items.reduce(
    (acc, item) => {
      const availability = inspector(item);

      Object.entries(availability).forEach(([key, exists]) => {
        acc[key] = (acc[key] || 0) + (exists ? 1 : 0);
      });

      return acc;
    },
    {
      image: 0,
      price: 0,
      permalink: 0,
      rating: 0,
      reviewCount: 0,
      soldQuantity: 0,
    }
  );
};

const shouldEnrich = (items) => {
  if (!items.length) {
    return false;
  }

  return items.every((item) => {
    const fields = isPlainObject(item) ? Object.keys(item) : [];

    return getExternalId(item) && fields.length <= 4;
  });
};

const enrichItem = async (highlightItem) => {
  const externalId = getExternalId(highlightItem);
  const externalType = normalizeExternalType(highlightItem);

  if (!externalId) {
    return {
      externalId,
      externalType,
      success: false,
      error: 'missing external id',
    };
  }

  const path = externalType === 'product' ? `/products/${externalId}` : `/items/${externalId}`;

  try {
    const payload = await client.get(path);
    let relatedItem = null;

    if (externalType === 'product') {
      try {
        const relatedItemsPayload = await client.get(`/products/${externalId}/items`, {
          limit: 3,
        });
        const relatedItems = Array.isArray(relatedItemsPayload?.results)
          ? relatedItemsPayload.results
          : [];

        relatedItem = relatedItems.find((item) => item?.item_id) || null;
      } catch (error) {
        relatedItem = {
          discoveryError: {
            status: error.status || null,
            message: error.message,
          },
        };
      }
    }

    const mergedPayload = {
      ...payload,
      marketplaceProductId: relatedItem?.item_id || payload.item_id || payload.id || externalId,
      title: payload.title || payload.name,
      permalink: relatedItem?.permalink || payload.permalink || buildCatalogProductUrl(payload.id || externalId),
      thumbnail: payload.thumbnail || payload.pictures?.[0]?.url,
      price: relatedItem?.price ?? payload.price ?? null,
      original_price: relatedItem?.original_price ?? payload.original_price ?? null,
      currency_id: relatedItem?.currency_id || payload.currency_id || 'BRL',
      condition: relatedItem?.condition || payload.condition || null,
      available_quantity: relatedItem?.available_quantity ?? payload.available_quantity ?? null,
      sold_quantity: relatedItem?.sold_quantity ?? payload.sold_quantity ?? null,
      category_id: relatedItem?.category_id || payload.category_id || null,
      seller_id: relatedItem?.seller_id || payload.seller_id || null,
    };
    const normalized = normalizeProduct({
      ...mergedPayload,
    });

    return {
      externalId,
      externalType: externalType || 'unknown',
      path,
      success: true,
      payloadFields: isPlainObject(payload) ? Object.keys(payload).sort() : [],
      relatedItem: relatedItem
        ? {
            id: relatedItem.item_id || null,
            fields: Object.keys(relatedItem).sort(),
            discoveryError: relatedItem.discoveryError || null,
          }
        : null,
      normalizedSummary: {
        marketplaceProductId: normalized.marketplaceProductId,
        title: normalized.title,
        permalink: normalized.permalink,
        thumbnail: normalized.thumbnail,
        price: normalized.price,
        originalPrice: normalized.originalPrice,
        currency: normalized.currency,
        categoryId: normalized.categoryId,
        soldQuantity: normalized.soldQuantity,
        rating: normalized.rating,
        reviewCount: normalized.reviewCount,
        brand: normalized.brand,
        model: normalized.model,
      },
      availability: inspectAvailability({
        ...payload,
        ...normalized,
      }),
    };
  } catch (error) {
    return {
      externalId,
      externalType: externalType || 'unknown',
      path,
      success: false,
      status: error.status || null,
      error: error.message,
      data: summarizeValue(error.data),
    };
  }
};

const buildResult = async () => {
  const payload = await client.get(HIGHLIGHTS_PATH);
  const { sourceField, items } = findHighlightItems(payload);
  const summarizedItems = items.map(summarizeHighlightItem);
  const ids = summarizedItems.map((item) => item.id).filter(Boolean);
  const rawAvailabilityCounts = countAvailability(items, inspectAvailability);
  const enrichmentNeeded = shouldEnrich(items);
  const enrichment = enrichmentNeeded
    ? await Promise.all(items.slice(0, ENRICHMENT_SAMPLE_LIMIT).map(enrichItem))
    : [];
  const enrichedAvailabilityCounts = countAvailability(
    enrichment.filter((item) => item.success).map((item) => item.normalizedSummary),
    inspectAvailability
  );

  return {
    status: 200,
    request: {
      path: HIGHLIGHTS_PATH,
      siteId: SITE_ID,
      categoryId: CATEGORY_ID,
    },
    rawPayloadSummary: {
      topLevelFields: isPlainObject(payload) ? Object.keys(payload).sort() : [],
      queryData: payload?.query_data || payload?.queryData || null,
      sourceField,
      sample: summarizeValue(payload),
    },
    itemCount: items.length,
    ids,
    idsByType: summarizedItems.reduce((acc, item) => {
      const type = item.type || 'unknown';
      acc[type] = [...(acc[type] || []), item.id].filter(Boolean);

      return acc;
    }, {}),
    rawItemFields: collectFields(items),
    rawItems: summarizedItems,
    rawAvailabilityCounts,
    enrichment: {
      attempted: enrichmentNeeded,
      sampleLimit: enrichmentNeeded ? ENRICHMENT_SAMPLE_LIMIT : 0,
      results: enrichment,
      enrichedAvailabilityCounts,
    },
    limitations: [
      items.length ? null : 'Highlights payload did not expose a recognized item array.',
      enrichmentNeeded ? 'Highlights returned a compact item list; enrichment is required for product details.' : null,
      rawAvailabilityCounts.price === 0 ? 'Price was not available directly in highlights items.' : null,
      rawAvailabilityCounts.permalink === 0 ? 'Permalink was not available directly in highlights items.' : null,
      rawAvailabilityCounts.rating === 0 ? 'Rating was not available directly in highlights items.' : null,
      rawAvailabilityCounts.reviewCount === 0 ? 'Review count was not available directly in highlights items.' : null,
      rawAvailabilityCounts.soldQuantity === 0 ? 'Sold quantity was not available directly in highlights items.' : null,
    ].filter(Boolean),
    viability:
      items.length > 0
        ? 'Viable as the official technical source for ranking order. Product detail fields should be enriched before any future persistence.'
        : 'Not yet viable until the payload shape is understood or the category exposes highlights.',
    nextImplementation:
      'Create a read-only sync design around this payload, then add persistence only in a later phase after field mapping is confirmed.',
  };
};

const main = async () => {
  try {
    const result = await buildResult();

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          status: error.status || 500,
          request: {
            path: HIGHLIGHTS_PATH,
            siteId: SITE_ID,
            categoryId: CATEGORY_ID,
          },
          error: error.message,
          data: summarizeValue(error.data),
          viability:
            error.status === 401
              ? 'Blocked until Mercado Livre credentials/token permissions are valid for highlights.'
              : 'Discovery failed; inspect status and Mercado Livre error payload before implementing persistence.',
          nextImplementation:
            'Fix discovery access first. Do not create schemas, cron, Product, Ranking or Page until this endpoint returns a valid payload.',
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }
};

main();
