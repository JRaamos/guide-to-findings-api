'use strict';

const DEFAULT_BASE_URL = 'https://api.mercadolibre.com';
const DEFAULT_SITE_ID = 'MLB';
const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;

let tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

class MercadoLivreApiError extends Error {
  constructor(message, { status, data, path } = {}) {
    super(message);
    this.name = 'MercadoLivreApiError';
    this.status = status;
    this.data = data;
    this.path = path;
  }
}

const getConfig = () => ({
  baseUrl: process.env.MERCADO_LIVRE_BASE_URL || DEFAULT_BASE_URL,
  siteId: process.env.MERCADO_LIVRE_SITE_ID || DEFAULT_SITE_ID,
  clientId: process.env.MERCADO_LIVRE_CLIENT_ID || null,
  clientSecret: process.env.MERCADO_LIVRE_CLIENT_SECRET || null,
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

const readJson = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
};

const buildErrorMessage = (status) => {
  if (status === 403) {
    return 'Mercado Livre denied access to this resource';
  }

  if (status === 429) {
    return 'Mercado Livre rate limit reached';
  }

  return `Mercado Livre request failed with status ${status}`;
};

const requestAccessToken = async () => {
  const { clientId, clientSecret } = getConfig();

  if (!clientId || !clientSecret) {
    throw new MercadoLivreApiError('Mercado Livre credentials are required for authenticated requests', {
      status: 401,
    });
  }

  const url = buildUrl('/oauth/token');
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await readJson(response);

  if (!response.ok || !data?.access_token) {
    throw new MercadoLivreApiError(buildErrorMessage(response.status), {
      status: response.status,
      data,
      path: '/oauth/token',
    });
  }

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 0) * 1000 - TOKEN_EXPIRY_BUFFER_MS,
  };

  return tokenCache.accessToken;
};

const getAccessToken = async () => {
  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }

  return requestAccessToken();
};

const get = async (path, params = {}, options = {}) => {
  const url = buildUrl(path, params);
  const headers = {
    Accept: 'application/json',
  };

  if (options.auth !== false) {
    headers.Authorization = `Bearer ${await getAccessToken()}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new MercadoLivreApiError(buildErrorMessage(response.status), {
      status: response.status,
      data,
      path,
    });
  }

  return data;
};

module.exports = {
  MercadoLivreApiError,
  get,
  getConfig,
};
