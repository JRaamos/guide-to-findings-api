module.exports = {
  routes: [
    {
     method: 'POST',
     path: '/mail/send-process-link',
     handler: 'mail.sendProcessLink',
     config: {
       policies: [],
       middlewares: [],
     },
    },
  ],
};
