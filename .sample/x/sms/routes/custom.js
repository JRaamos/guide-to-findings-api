module.exports = {
    routes: [
      {
        method: 'POST',
        path: "/sms-services/validate",
        handler: 'sms-service.validate',
        config: {
          policies: []
        }
      },
      {
        method: 'POST',
        path: "/sms-services/login",
        handler: 'sms-service.login',
        config: {
          policies: []
        }
      }
    ]
  }