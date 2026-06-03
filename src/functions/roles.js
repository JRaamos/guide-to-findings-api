'use strict'

const fs = require("fs");
const path = require("path");

const exportRolesPermissions = async () => {
    const workdir = path.join(__dirname, "..", ".tmp-roles");
    fs.mkdirSync(workdir, { recursive: true });

    const roleService = strapi.plugin('users-permissions').service('role');
    const roles = await roleService.find();

    for (const role of roles) {
        const fullRole = await roleService.findOne(role.id);

        const data = {
            ...fullRole,
        };

        const filename = `${role.type}.json`;
        fs.writeFileSync(
            path.join(workdir, filename),
            JSON.stringify(data, null, 2),
            "utf-8"
        );
    }

    console.log("Roles exportadas com sucesso para", workdir);
};

const updateRolesPermissions = async () => {
    const workdir = path.join(__dirname, "..", ".tmp-roles");

    if (fs.existsSync(workdir)) {
        const files = fs.readdirSync(workdir);
        const roleService = strapi.plugin('users-permissions').service('role');

        for (const file of files) {
            const filePath = path.join(workdir, file);
            const content = fs.readFileSync(filePath, "utf-8");
            const role = JSON.parse(content);

            console.log("Updating role", role?.name);
            const updatedRoles = await roleService.updateRole(role?.id, role);
            console.log("Role", updatedRoles, "updated successfully");

            fs.rmSync(filePath);
            console.log("File", filePath, "removed successfully");
        }
    }
};
 
module.exports = {
    exportRolesPermissions,
    updateRolesPermissions
}