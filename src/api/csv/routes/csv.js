module.exports = {
  routes: [
    {
      "method": "GET",
      "path": "/csv/download",
      "handler": "csv.download",
      "config": {
        "policies": []
      }
    },
    {
      "method": "POST",
      "path": "/csv/upload",
      "handler": "csv.upload",
      "config": {
        "policies": []
      }
    }
  ],
};