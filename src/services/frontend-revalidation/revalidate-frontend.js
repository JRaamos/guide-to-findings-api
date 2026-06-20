'use strict';

const REQUEST_TIMEOUT_MS = 10000;

const sanitizeText = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const stripTrailingSlash = (value) => value.replace(/\/+$/, '');

const buildRevalidationTargets = ({ categorySlug, contentSlug, publicUrl }) => {
  const category = sanitizeText(categorySlug);
  const content = sanitizeText(contentSlug);
  let pagePath = sanitizeText(publicUrl);

  if (pagePath.startsWith('http://') || pagePath.startsWith('https://')) {
    pagePath = new URL(pagePath).pathname;
  }

  if (!pagePath && category && content) {
    pagePath = `/${category}/${content}`;
  }

  if (!pagePath.startsWith('/')) {
    pagePath = `/${pagePath}`;
  }

  return {
    paths: [...new Set([
      pagePath,
      category ? `/${category}` : null,
      '/',
      '/sitemap.xml',
    ].filter(Boolean))],
    tags: [...new Set([
      category && content ? `page:${category}:${content}` : null,
      category ? `category:${category}` : null,
      'homepage',
      'sitemap',
      'pages',
    ].filter(Boolean))],
  };
};

const revalidateFrontendPage = async ({
  categorySlug,
  contentSlug,
  publicUrl,
} = {}) => {
  const frontendBaseUrl = sanitizeText(process.env.FRONTEND_BASE_URL);
  const secret = sanitizeText(process.env.FRONTEND_REVALIDATE_SECRET);
  const targets = buildRevalidationTargets({ categorySlug, contentSlug, publicUrl });

  if (!frontendBaseUrl || !secret) {
    return {
      attempted: false,
      success: false,
      ...targets,
      error: 'FRONTEND_BASE_URL and FRONTEND_REVALIDATE_SECRET must be configured',
    };
  }

  const endpoint = `${stripTrailingSlash(frontendBaseUrl)}/api/revalidate`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-revalidate-secret': secret,
      },
      body: JSON.stringify({
        categorySlug,
        contentSlug,
        publicUrl,
        ...targets,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        attempted: true,
        success: false,
        endpoint,
        status: response.status,
        ...targets,
        error: responseBody?.error || `Frontend revalidation failed with status ${response.status}`,
      };
    }

    return {
      attempted: true,
      success: true,
      endpoint,
      status: response.status,
      paths: responseBody?.paths || targets.paths,
      tags: responseBody?.tags || targets.tags,
      revalidatedAt: responseBody?.revalidatedAt || new Date().toISOString(),
    };
  } catch (error) {
    return {
      attempted: true,
      success: false,
      endpoint,
      ...targets,
      error: error.message,
    };
  }
};

module.exports = {
  buildRevalidationTargets,
  revalidateFrontendPage,
};
