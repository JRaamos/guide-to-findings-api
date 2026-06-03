module.exports = {
  routes: [
    {
     method: 'GET',
     path: '/pagarme',
     handler: 'pagarme.sandbox',
     config: {
       policies: [],
       middlewares: [],
     },
    },
    {
      method: 'DELETE',
      path: '/pagarme/subscription-plan',
      handler: 'pagarme.cancelSubscription',
      config: {
        policies: [],
        middlewares: [],
      },
     },
     {
      method: 'POST',
      path: '/pagarme/subscription-plan',
      handler: 'pagarme.createSubscription',
      config: {
        policies: [],
        middlewares: [],
      },
     },
    {
      method: 'POST',
      path: '/pagarme/create-card-customer',
      handler: 'pagarme.createCard',
      config: {
        policies: [],
        middlewares: [],
      },
     },
  ],
};
