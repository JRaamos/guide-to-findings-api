'use strict';

const findAttributeValue = (attributes = [], ids = []) => {
  const attribute = attributes.find((item) => ids.includes(item.id) || ids.includes(item.name));

  return attribute?.value_name || attribute?.value_id || null;
};

const normalizeAttributes = (attributes = []) => {
  return attributes.reduce((acc, attribute) => {
    const key = attribute.id || attribute.name;

    if (!key) {
      return acc;
    }

    acc[key] = {
      id: attribute.id || null,
      name: attribute.name || null,
      valueId: attribute.value_id || null,
      valueName: attribute.value_name || null,
    };

    return acc;
  }, {});
};

const normalizeProduct = (product = {}) => {
  const attributes = Array.isArray(product.attributes) ? product.attributes : [];

  return {
    marketplaceProductId: product.id || null,
    title: product.title || null,
    permalink: product.permalink || null,
    thumbnail: product.thumbnail || null,
    price: product.price ?? null,
    originalPrice: product.original_price ?? null,
    currency: product.currency_id || null,
    condition: product.condition || null,
    availableQuantity: product.available_quantity ?? null,
    soldQuantity: product.sold_quantity ?? null,
    categoryId: product.category_id || null,
    sellerId: product.seller?.id || null,
    attributes: normalizeAttributes(attributes),
    brand: findAttributeValue(attributes, ['BRAND', 'Marca']),
    model: findAttributeValue(attributes, ['MODEL', 'Modelo']),
    rating: product.reviews?.rating_average ?? null,
    reviewCount: product.reviews?.total ?? null,
  };
};

module.exports = {
  normalizeProduct,
};
