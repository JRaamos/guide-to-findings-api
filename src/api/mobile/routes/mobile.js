module.exports = {
  routes: [
    {
      "method": "GET",
      "path": "/mobile/deeplink",
      "handler": "mobile.deeplink",
      "config": {
        "policies": [],
        "prefix": "",
        "description": "Redirect to app deeplink with redirect params"
      }
    },
    {
      "method": "GET",
      "path": "/mobile/store",
      "handler": "mobile.store",
      "config": {
        "policies": [],
        "prefix": "",
        "description": "Redirect to app store"
      }
    }
  ],
};
