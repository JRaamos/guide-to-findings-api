'use strict';

const gateway = () => { return strapi.plugins['mercado-pago'].services.mercado }

module.exports = {
    methods: async () => {
        return gateway().listPaymentMethods();
    }
}