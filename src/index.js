'use strict';

const { exportRolesPermissions, updateRolesPermissions } = require("./functions/roles");
const {
  backfillDiscoveryWorkspaces,
} = require('./services/seo-intelligence/discovery-workspaces');

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) { },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    await checkExportRoles();

    try {
      const result = await backfillDiscoveryWorkspaces(strapi);

      if (result.linkedTopics > 0) {
        strapi.log.info(
          `[SEO Intelligence] Discovery workspace backfill linked ${result.linkedTopics} topics`
        );
      }
    } catch (error) {
      strapi.log.warn(
        `[SEO Intelligence] Discovery workspace backfill skipped: ${error.message}`
      );
    }
  },
};

const checkExportRoles = async () => {
    if (process.env.EXPORT_ROLES === "true") {
        await exportRolesPermissions();
        console.log("\n\nExportação concluída.\nEncerrando Strapi...\n\n");
        process.exit(0);
    }
    if (process.env.UPDATE_ROLES === "true") {
        await updateRolesPermissions();
        console.log("\n\nImportação concluída.\nEncerrando Strapi...\n\n");
        process.exit(0);
    }
}
