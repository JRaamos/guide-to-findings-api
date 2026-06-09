'use strict';

require('dotenv').config();

const { createStrapi } = require('@strapi/strapi');

const MARKETPLACE_DATA = {
  name: 'Mercado Livre',
  slug: 'mercado-livre',
  baseUrl: 'https://www.mercadolivre.com.br',
  status: 'active',
};

const ensureMarketplace = async (strapi) => {
  const existing = await strapi.db.query('api::marketplace.marketplace').findOne({
    where: {
      slug: MARKETPLACE_DATA.slug,
    },
  });

  if (existing) {
    return strapi.db.query('api::marketplace.marketplace').update({
      where: {
        id: existing.id,
      },
      data: MARKETPLACE_DATA,
    });
  }

  return strapi.db.query('api::marketplace.marketplace').create({
    data: MARKETPLACE_DATA,
  });
};

const main = async () => {
  const app = await createStrapi().load();

  try {
    const marketplace = await ensureMarketplace(app);

    console.log(
      JSON.stringify(
        {
          success: true,
          marketplace: {
            id: marketplace.id,
            name: marketplace.name,
            slug: marketplace.slug,
            status: marketplace.status,
          },
        },
        null,
        2
      )
    );
  } finally {
    await app.destroy();
  }
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
