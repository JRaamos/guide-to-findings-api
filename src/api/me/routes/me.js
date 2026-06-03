module.exports = {
  routes: [
    {
      "method": "GET",
      "path": "/me",
      "handler": "me.read",
      "config": {
        "policies": [],
        "prefix": "",
        "description": "Read ME"
      }
    },
    {
      "method": "PUT",
      "path": "/me",
      "handler": "me.update",
      "config": {
        "policies": [],
        "prefix": "",
        "description": "Update ME"
      }
    },
    {
      "method": "PUT",
      "path": "/me/password",
      "handler": "me.updatePassword",
      "config": {
        "policies": [],
        "prefix": "",
        "description": "Update ME password"
      }
    },
    {
      "method": "DELETE",
      "path": "/me",
      "handler": "me.remove",
      "config": {
        "policies": [],
        "prefix": "",
        "description": "Delete ME"
      }
    }
  ],
};
