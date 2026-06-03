'use strict';
const axios = require('axios');
const configs = () => { return strapi.plugins['mercado-pago'].config }


const accessToken = () => {
    switch (configs().ENV) {
        case 'test':
            return configs().TEST_ACCESS_TOKEN;
        case 'production':
            return configs().ACCESS_TOKEN;
        default:
            throw "The ENV Configuration must be 'test' or 'production'"
    }
}


/**** Objeto esperado para dados do cliente (client_data) ****/
// client_data = {
//     "email": "bruno@gmail.com",
//     "first_name": "Bruce",
//     "last_name": "Wayne",
//     "phone": {
//         "area_code": "023",
//         "number": "12345678"
//     },
//     "identification": {
//         "type": "DNI",
//         "number": "12345678"
//     },
//     "address": {
//         "zip_code": "SG1 2AX",
//         "street_name": "Old Knebworth Ln"
//     },
//     "description": "Lorem Ipsum"
// }


/**** Objeto esperado para card_data ****/
// card_data = {
//     "token": "b3a7dbec3eb0d71798c4f19fec445795"
// }

module.exports = {
    listClients: async () => {
        const route = '/v1/customers/search'
        const config = {
            method: 'get',
            url: `${configs().BASE_URL}${route}?access_token=${accessToken()}`,
            headers: {}
        };

        return axios(config)
            .then(function (response) {
                return response.data;
            })
    },


    getClient: async (client_id) => {
        const route = '/v1/customers/' + client_id;
        const config = {
            method: 'get',
            url: `${configs().BASE_URL}${route}?access_token=${accessToken()}`,
            headers: {}
        };

        return axios(config)
            .then(function (response) {
                return response.data;
            })
    },


    newClient: async (client_data) => {
        const route = '/v1/customers'
        const config = {
            method: 'post',
            url: `${configs().BASE_URL}${route}?access_token=${accessToken()}`,
            data: client_data
        };

        return axios(config)
            .then(function (response) {
                return response.data;
            })
    },


    updateClient: async (client_id, client_data) => {
        const route = '/v1/customers/' + client_id;
        const config = {
            method: 'put',
            url: `${configs().BASE_URL}${route}?access_token=${accessToken()}`,
            data: client_data
        };

        return axios(config)
            .then(function (response) {
                return response.data;
            })
            .catch(err => err)
    },


    addCreditCard: async (client_id, card_data) => {
        const route = `/v1/customers/${client_id}/cards`;
        const config = {
            method: 'post',
            url: `${configs().BASE_URL}${route}?access_token=${accessToken()}`,
            data: card_data
        };

        return axios(config)
            .then(function (response) {
                return response.data;
            })
    },


    listPaymentMethods: async () => {
        const route = '/v1/payment_methods'
        const config = {
            method: 'get',
            url: `${configs().BASE_URL}${route}?access_token=${accessToken()}`,
        };

        return axios(config)
            .then(function (response) {
                return response.data;
            })
    },


    getPaymentInfo: async (payment_id) => {
        const route = '/v1/payments/' + payment_id;
        const config = {
            method: 'get',
            url: `${configs().BASE_URL}${route}?access_token=${accessToken()}`,
        };

        return axios(config)
            .then(function (response) {
                return response.data;
            })
    },


    performPayment: async (payment_data) => {
        const route = '/v1/payments'
        const config = {
            method: 'post',
            url: `${configs().BASE_URL}${route}?access_token=${accessToken()}`,
            data: payment_data
        };

        return axios(config)
            .then(function (response) {
                return response.data;
            })
    },
};