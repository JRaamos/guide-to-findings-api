module.exports = ({ env }) => ({
  email: {
    enabled: false,
  },
  "users-permissions": {},
  "ranking-generator": {
    enabled: true,
    resolve: "./src/plugins/ranking-generator",
  },
  "seo-intelligence": {
    enabled: true,
    resolve: "./src/plugins/seo-intelligence",
  },
});
