'use strict';

require('dotenv').config();

const client = require('../src/services/marketplaces/mercado-livre/client');
const {
  resolveMarketplaceCategory,
} = require('../src/services/marketplaces/mercado-livre/category-resolver');

const DEFAULT_TERM = 'furadeira';

const getTerm = () => {
  const term = process.argv.slice(2).join(' ').trim();

  return term || DEFAULT_TERM;
};

const toLegacyCandidate = (candidate) => {
  if (!candidate) {
    return null;
  }

  return {
    categoryId: candidate.id,
    categoryName: candidate.name,
    domainId: candidate.domainId,
    domainName: candidate.domainName,
    source: candidate.source,
    confidence: candidate.confidence,
    confidenceSource: candidate.confidenceSource,
    finalScore: candidate.finalScore,
    rootCategory: candidate.rootCategory,
    path: candidate.path,
    totalItems: candidate.totalItems,
    hasHighlights: Boolean(candidate.hasHighlights),
    highlightsCount: candidate.highlightsCount || 0,
    highlightTypes: candidate.highlightTypes || [],
    categoryError: candidate.categoryError || null,
    highlightsError: candidate.highlightsError || null,
  };
};

const main = async () => {
  const term = getTerm();
  const siteId = client.getConfig().siteId;
  const result = await resolveMarketplaceCategory({
    siteId,
    term,
    validateHighlights: true,
  });
  const best = result.bestCategory;

  console.log(
    JSON.stringify(
      {
        term: result.term,
        siteId: result.siteId,
        resolved: result.resolved,
        bestCategoryId: best?.id || null,
        bestCategoryName: best?.name || null,
        source: best?.source || null,
        hasHighlights: Boolean(best?.hasHighlights),
        highlightsCount: best?.highlightsCount || 0,
        confidence: best?.confidence ?? null,
        confidenceSource: best?.confidenceSource || null,
        finalScore: best?.finalScore ?? null,
        rootCategory: best?.rootCategory || null,
        path: best?.path || [],
        alternativeCategories: result.alternatives.map(toLegacyCandidate),
        bestCandidate: toLegacyCandidate(best),
        errors: result.errors,
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: error.message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
