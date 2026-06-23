'use strict';

require('dotenv').config();

const { createStrapi } = require('@strapi/strapi');
const {
  backfillDiscoveryWorkspaces,
  listDiscoveryWorkspaces,
} = require('../src/services/seo-intelligence/discovery-workspaces');

const main = async () => {
  const app = await createStrapi().load();

  try {
    const result = await backfillDiscoveryWorkspaces(app);
    const workspaces = await listDiscoveryWorkspaces(app);

    console.log(JSON.stringify({
      success: true,
      backfill: result,
      workspaces: workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        workspaceKey: workspace.workspaceKey,
        totalTopics: workspace.totalTopics,
      })),
    }, null, 2));
  } finally {
    await app.destroy();
  }
};

main().catch((error) => {
  console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
  process.exit(1);
});
