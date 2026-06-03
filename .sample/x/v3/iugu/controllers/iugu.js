'use strict';



module.exports = {
  /** */
  createCustomer: async (ctx) => {
    try {
      const services = strapi.plugins["iugu"].services.iugu;

      
      let result = await services.createCustomer(data);
      ctx.send(result);

    } catch (error) {
      ctx.notFound(error);
    }
  },

  findCustomers: async (ctx) => {
    try {
      const services = strapi.plugins["iugu"].services.iugu;
      let result = await services.findCustomers();
      ctx.send(result);

    } catch (error) {
      ctx.notFound(error);
    }
  },

  findCustomerById: async (ctx) => {
    try {
      let params = ctx.request.query;

      if(!params.id) {
        return ctx.badRequest("id is empty");  
      }
      
      const services = strapi.plugins["iugu"].services.iugu;
      let result = await services.findCustomerById(params.id);
      ctx.send(result);

    } catch (error) {
      ctx.notFound(error);
    }
  }
};
