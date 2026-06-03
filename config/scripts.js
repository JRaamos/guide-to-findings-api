require('dotenv').config();
const fs = require('fs');

var pathDocker = "";

if (process.env.NODE_ENV === "production") {
    pathDocker = "/opt/";
}


fs.cp('src/admin/admin/HomePage', `${pathDocker}node_modules/@strapi/admin/admin/src/pages/HomePage`, { recursive: true }, (err) => {
    if (err) {
        console.error(err);
    }
});


fs.cp('src/admin/admin/SettingsPage', `${pathDocker}node_modules/@strapi/admin/admin/src/pages/SettingsPage/pages/ApplicationInfosPage`, { recursive: true }, (err) => {
    if (err) {
        console.error(err);
    }
});