'use strict';

const uid = {
  category: 'api::category.category',
  subCategory: 'api::sub-category.sub-category',
};

const GENERIC_SUBCATEGORY_NAMES = new Set([
  'de ar',
  'de mao',
  'de mão',
  'de bancada',
  'outros',
  'outras',
]);
const TERM_STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'com', 'e']);

const query = (strapi, modelUid) => strapi.db.query(modelUid);

const normalizeText = (value = '') => {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const slugify = (value = '') => {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
};

const tokenize = (value = '') => {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !TERM_STOPWORDS.has(token));
};

const pluralizeToken = (token) => {
  if (!token || token.endsWith('s')) {
    return token;
  }

  return `${token}s`;
};

const hasTermMatch = (name, term) => {
  const normalizedName = normalizeText(name);
  const tokens = tokenize(term);

  return tokens.some((token) => {
    return normalizedName.includes(token) || normalizedName.includes(pluralizeToken(token));
  });
};

const isGenericSubCategoryName = (name) => {
  return GENERIC_SUBCATEGORY_NAMES.has(normalizeText(name));
};

const getPath = (resolvedCategory = {}) => {
  return Array.isArray(resolvedCategory.path) ? resolvedCategory.path.filter((item) => item?.name) : [];
};

const chooseLocalCategoryName = (path) => {
  return path[0]?.name || null;
};

const chooseLocalSubCategoryName = ({ path, term, resolvedCategory }) => {
  const searchablePath = path.slice(1);
  const termMatched = [...searchablePath]
    .reverse()
    .find((item) => hasTermMatch(item.name, term));

  if (termMatched?.name) {
    return termMatched.name;
  }

  const leafName = resolvedCategory.name || path[path.length - 1]?.name || null;

  if (leafName && !isGenericSubCategoryName(leafName)) {
    return leafName;
  }

  if (path.length >= 2) {
    return path[path.length - 2].name;
  }

  return leafName;
};

const validateResolvedCategory = ({ term, resolvedCategory }) => {
  const path = getPath(resolvedCategory);

  if (!resolvedCategory?.id) {
    throw new Error('resolvedCategory.id is required');
  }

  if (!resolvedCategory?.name) {
    throw new Error('resolvedCategory.name is required');
  }

  if (!path.length) {
    throw new Error('resolvedCategory.path is required');
  }

  if (!term || !tokenize(term).length) {
    throw new Error('term is required');
  }

  return path;
};

const buildCategoryDescription = (name) => {
  return `Guias, rankings e comparativos de ${name}.`;
};

const buildSubCategoryDescription = (name, categoryName) => {
  return `Guias e rankings de ${name} em ${categoryName}.`;
};

const upsertCategory = async (strapi, name) => {
  const slug = slugify(name);

  if (!name || !slug) {
    throw new Error('local Category name and slug are required');
  }

  const existing = await query(strapi, uid.category).findOne({
    where: {
      slug,
    },
  });
  const data = {
    name,
    slug,
    description: existing?.description || buildCategoryDescription(name),
    status: 'active',
  };

  if (existing) {
    const record = await query(strapi, uid.category).update({
      where: {
        id: existing.id,
      },
      data,
    });

    return {
      record,
      created: false,
    };
  }

  const record = await query(strapi, uid.category).create({
    data,
  });

  return {
    record,
    created: true,
  };
};

const upsertSubCategory = async (strapi, name, category) => {
  const slug = slugify(name);

  if (!name || !slug) {
    throw new Error('local SubCategory name and slug are required');
  }

  const existing = await query(strapi, uid.subCategory).findOne({
    where: {
      slug,
    },
    populate: ['category'],
  });
  const data = {
    name,
    slug,
    description: existing?.description || buildSubCategoryDescription(name, category.name),
    status: 'active',
    category: category.id,
  };

  if (existing) {
    const record = await query(strapi, uid.subCategory).update({
      where: {
        id: existing.id,
      },
      data,
    });

    return {
      record,
      created: false,
    };
  }

  const record = await query(strapi, uid.subCategory).create({
    data,
  });

  return {
    record,
    created: true,
  };
};

const syncLocalCategoriesFromMarketplaceCategory = async (
  strapi,
  { term, resolvedCategory } = {}
) => {
  if (!strapi?.db) {
    throw new Error('strapi instance is required');
  }

  const path = validateResolvedCategory({
    term,
    resolvedCategory,
  });
  const categoryName = chooseLocalCategoryName(path);
  const subCategoryName = chooseLocalSubCategoryName({
    path,
    term,
    resolvedCategory,
  });
  const categoryResult = await upsertCategory(strapi, categoryName);
  const subCategoryResult = await upsertSubCategory(
    strapi,
    subCategoryName,
    categoryResult.record
  );

  return {
    categoryId: categoryResult.record.id,
    subCategoryId: subCategoryResult.record.id,
    categoryCreated: categoryResult.created,
    subCategoryCreated: subCategoryResult.created,
    categorySlug: categoryResult.record.slug,
    subCategorySlug: subCategoryResult.record.slug,
    categoryName: categoryResult.record.name,
    subCategoryName: subCategoryResult.record.name,
    rule: 'category=path[0], subCategory=deepest term-matched path segment or non-generic leaf',
  };
};

module.exports = {
  syncLocalCategoriesFromMarketplaceCategory,
};
