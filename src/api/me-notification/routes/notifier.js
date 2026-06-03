module.exports = {
  routes: [
      {
          "method": "GET",
          "path": "/me-notifications",
          "handler": "notifier.notifications",
          "config": {
              "policies": [],
              "prefix": "",
              "description": "Read user notifications"
          }
      },       
      {
          "method": "POST",
          "path": "/me-notifications/token",
          "handler": "notifier.saveDeviceToken",
          "config": {
              "policies": [],
              "prefix": "",
              "description": "Save device token belongs user"
          }
      },          
      {
          "method": "PUT",
          "path": "/me-notifications/:id",
          "handler": "notifier.updateNotification",
          "config": {
              "policies": [],
              "prefix": "",
              "description": "Update notification"
          }
      },          
      {
          "method": "DELETE",
          "path": "/me-notifications/:id",
          "handler": "notifier.remove",
          "config": {
              "policies": [],
              "prefix": "",
              "description": "Remove one notification"
          }
      },
      {
          "method": "DELETE",
          "path": "/me-notifications-all",
          "handler": "notifier.removeAll",
          "config": {
              "policies": [],
              "prefix": "",
              "description": "Remove all notifications"
          }
      }
  ],
};