'use strict';

const DEFAULT_BASE_URL = 'https://trends.google.com.br';
const DEFAULT_GEO = 'BR';
const DEFAULT_LOCALE = 'pt-BR';
const DEFAULT_TIMEFRAME = 'today 12-m';
const DEFAULT_TIMEZONE = '180';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 3;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

class GoogleTrendsError extends Error {
  constructor(message, { status = null, cause = null } = {}) {
    super(message, { cause });
    this.name = 'GoogleTrendsError';
    this.status = status;
  }
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const parseGoogleJson = (text) => {
  const jsonStart = text.indexOf('{');

  if (jsonStart < 0) {
    throw new GoogleTrendsError('Google Trends returned an unexpected response');
  }

  try {
    return JSON.parse(text.slice(jsonStart));
  } catch (error) {
    throw new GoogleTrendsError('Google Trends returned invalid JSON', { cause: error });
  }
};

const extractCookies = (headers) => {
  const setCookies = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [headers.get('set-cookie')].filter(Boolean);

  return setCookies
    .map((value) => value.match(/^([^=;,]+=[^;]*)/)?.[1])
    .filter(Boolean)
    .join('; ');
};

const buildHeaders = ({ cookie, referer } = {}) => ({
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'User-Agent': USER_AGENT,
  ...(cookie ? { Cookie: cookie } : {}),
  ...(referer ? { Referer: referer } : {}),
});

const requestJson = async (url, { cookie, referer, retries = DEFAULT_RETRIES } = {}) => {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: buildHeaders({ cookie, referer }),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
      const text = await response.text();

      if (response.ok) {
        return parseGoogleJson(text);
      }

      lastError = new GoogleTrendsError(
        response.status === 429
          ? 'Google Trends rate limit reached'
          : `Google Trends request failed with status ${response.status}`,
        { status: response.status }
      );

      if (response.status !== 429 && response.status < 500) {
        throw lastError;
      }
    } catch (error) {
      if (error instanceof GoogleTrendsError && error.status && error.status !== 429 && error.status < 500) {
        throw error;
      }

      lastError = error instanceof GoogleTrendsError
        ? error
        : new GoogleTrendsError('Google Trends request failed', { cause: error });
    }

    if (attempt < retries) {
      await sleep(attempt * 1000);
    }
  }

  throw lastError;
};

const createSession = async ({ baseUrl, term, geo, locale, timeframe }) => {
  const explorePageUrl = new URL('/trends/explore', baseUrl);
  explorePageUrl.searchParams.set('date', timeframe);
  explorePageUrl.searchParams.set('geo', geo);
  explorePageUrl.searchParams.set('q', term);
  explorePageUrl.searchParams.set('hl', locale);

  const response = await fetch(explorePageUrl, {
    headers: buildHeaders(),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  // Google may rate-limit the HTML shell while still issuing the session cookie
  // required by its data endpoints.
  await response.text();

  return {
    cookie: extractCookies(response.headers),
    referer: explorePageUrl.toString(),
  };
};

const buildExploreUrl = ({ baseUrl, term, geo, locale, timeframe, timezone }) => {
  const url = new URL('/trends/api/explore', baseUrl);
  const request = {
    comparisonItem: [{ keyword: term, geo, time: timeframe }],
    category: 0,
    property: '',
  };

  url.searchParams.set('hl', locale);
  url.searchParams.set('tz', timezone);
  url.searchParams.set('req', JSON.stringify(request));

  return url;
};

const buildRelatedQueriesUrl = ({ baseUrl, locale, timezone, widget }) => {
  const url = new URL('/trends/api/widgetdata/relatedsearches', baseUrl);

  url.searchParams.set('hl', locale);
  url.searchParams.set('tz', timezone);
  url.searchParams.set('req', JSON.stringify(widget.request));
  url.searchParams.set('token', widget.token);

  return url;
};

const mapRankedKeywords = (rankedList = []) => {
  return rankedList.flatMap((list, listIndex) => {
    const trendType = listIndex === 0 ? 'top' : 'rising';

    return (list.rankedKeyword || []).map((item) => ({
      keyword: item.query,
      value: Number(item.value) || 0,
      formattedValue: item.formattedValue || null,
      trendType,
    }));
  });
};

const discoverGoogleTrends = async ({
  term,
  geo = DEFAULT_GEO,
  locale = DEFAULT_LOCALE,
  timeframe = DEFAULT_TIMEFRAME,
  timezone = DEFAULT_TIMEZONE,
  baseUrl = process.env.GOOGLE_TRENDS_BASE_URL || DEFAULT_BASE_URL,
} = {}) => {
  const normalizedTerm = term?.toString().replace(/\s+/g, ' ').trim();

  if (!normalizedTerm) {
    throw new GoogleTrendsError('A term is required for Google Trends discovery');
  }

  const session = await createSession({
    baseUrl,
    term: normalizedTerm,
    geo,
    locale,
    timeframe,
  });
  const exploreData = await requestJson(
    buildExploreUrl({ baseUrl, term: normalizedTerm, geo, locale, timeframe, timezone }),
    session
  );
  const relatedQueriesWidget = exploreData.widgets?.find((widget) => widget.id === 'RELATED_QUERIES');

  if (!relatedQueriesWidget?.request || !relatedQueriesWidget?.token) {
    throw new GoogleTrendsError(`Google Trends returned no related queries widget for "${normalizedTerm}"`);
  }

  const relatedData = await requestJson(
    buildRelatedQueriesUrl({ baseUrl, locale, timezone, widget: relatedQueriesWidget }),
    session
  );

  return {
    term: normalizedTerm,
    source: 'google_trends',
    geo,
    timeframe,
    signals: mapRankedKeywords(relatedData.default?.rankedList),
  };
};

module.exports = {
  GoogleTrendsError,
  discoverGoogleTrends,
};
