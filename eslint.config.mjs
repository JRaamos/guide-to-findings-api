import globals from "globals";
import pluginJs from "@eslint/js";

export default [
    { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
    {
        languageOptions: {
            globals: {
                strapi: 'readonly',
                ...globals.node,
            },
        },
    },
    {
        files: ["src/admin/**/*.js", "src/admin/**/*.jsx"],
        languageOptions: {
            sourceType: "module"
        },
    },
    {
        ignores: [".cache/**", "build/**", "**/node_modules/**"]
    },
    pluginJs.configs.recommended,
];
