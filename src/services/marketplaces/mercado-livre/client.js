'use strict';

const DEFAULT_BASE_URL = 'https://api.mercadolibre.com';
const DEFAULT_SITE_ID = 'MLB';

const getConfig = () => ({
  baseUrl: process.env.MERCADO_LIVRE_BASE_URL || DEFAULT_BASE_URL,
  siteId: process.env.MERCADO_LIVRE_SITE_ID || DEFAULT_SITE_ID,
});

const buildUrl = (path, params = {}) => {
  const { baseUrl } = getConfig();
  const url = new URL(path, baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
};

const get = async (path, params = {}) => {
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Mercado Livre request failed with status ${response.status}`);
  }

  return response.json();
};

module.exports = {
  get,
  getConfig,
};
