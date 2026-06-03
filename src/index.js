'use strict';

const { exportRolesPermissions, updateRolesPermissions } = require("./functions/roles");
const { strapiSocket } = require("./functions/socket");

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
  bootstrap({ strapi }) {
    beginsSocket(strapi)
    checkExportRoles()
  },
};

const beginsSocket = async strapi => {
    await strapiSocket(strapi);
}

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