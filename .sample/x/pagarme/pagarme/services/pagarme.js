'use strict';

const axios = require('axios');



const HOST = process.env.PAGARME_HOST;
const SECRET = process.env.PAGARME_SECRET_KEY;
const PUBLIC = process.env.PAGARME_PUBLIC_KEY;
const HEADERS = {
  headers: {
    "Authorization": 'Basic ' + Buffer.from(`${SECRET}:`).toString('base64'),
    "Content-Type": "application/json"
  }
}

/**
 * 
 * @params planId 
 */
const getPlans = async (planId) => {
  try {
    if(planId) {
      return await axios.get(`${HOST}/plans/${planId}`, HEADERS).then(e => e.data).catch(error => error);
    }

    return await axios.get(`${HOST}/plans`, HEADERS).then(e => e.data).catch(error => error);

  } catch (error) {
    return error;
  }
}


/**
 * 
 * @params data = {
      "name": "Plano Gold",
      "currency": "BRL",
      "interval": "month",
      "interval_count": 1,
      "billing_type": "postpaid",
      "payment_methods": ["credit_card", "debit_card", "cash", "boleto"],
      "minimum_price": 10000,
      "installments": [2],
      "items": [
        {
          "name": "Musculação",
          "quantity": 1,
          "pricing_scheme": {
            "price": 18990
          }
        },
        {
          "name": "Matrícula",
          "cycles": 1,
          "quantity": 1,
          "pricing_scheme": {
            "price": 5990
          }
        }
      ],
      "metadata": {
        "id": "my_plan_id"
      }
    }
 */
const setPlan = async (data) => {
  try {
    if(!data) return false;
    return axios.post(`${HOST}/plans`, data, HEADERS)
      .then(e => e.data)
      .catch(error => error);

  } catch (error) {
    return error;
  }
}


/**
 * 
 * @param {*} planId 
 * @returns object
 */
const putPlan = async (planId, data) => {
  try {
    if(!planId) return false;
    return axios.put(`${HOST}/plans/${planId}`, data, HEADERS).then(e => e.data).catch(error => error);

  } catch (error) {
    return error;
  }
}


/**
 * 
 * @param {*} planId 
 * @returns object
 */
const deletePlan = async (planId) => {
  try {
    if(!planId) return false;
    return axios.delete(`${HOST}/plans/${planId}`, HEADERS).then(e => e.data).catch(error => error);

  } catch (error) {
    return error;
  }
}

/**
 * 
 * @param {*} data 
 * @returns 
 */
const createCustomer = async (data) => {
  try {
    if(!data) return false;
    return axios.post(`${HOST}/customers`, data, HEADERS)
      .then(e => e.data)
      .catch(error => error.response.data);

  } catch (error) {
    return error;
  }
}

/**
 * 
 * @param {*} id 
 * @returns 
 */
const getCustomer = async (id) => {
  try {
    if(!id) return false;
    return axios.get(`${HOST}/customers/${id}`, HEADERS).then(e => e.data).catch(error => error);

  } catch (error) {
    return error;
  }
}


const createTokenCard = async (data) => {
  try {
    if(!data) return false;
    return axios.post(`${HOST}/tokens?appId=${PUBLIC}`, data, HEADERS)
      .then(e => e.data)
      .catch(error => error.response.data);

  } catch (error) {
    return error;
  }
}

const createCustomHashCard = async (data) => {
  try {
    if(!data.number) return "empty number";
    if(!data.holder_name) return "empty holder name";
    if(!data.exp_month) return "empty exp month";
    if(!data.exp_year) return "empty exp year";
    if(!data.cvv) return "empty cvv";
    if(!data.brand) return "empty brand";
    
    const hash = { 
      number: data.number,
      holder_name: data.holder_name,
      exp_month: data.exp_month,
      exp_year: data.exp_year,
      cvv: data.cvv,
      brand: data.brand,
    }

    return { token: Buffer.from(JSON.stringify(hash)).toString('base64') };


  } catch (error) {
    return error;
  }
}

const getCustomHashCard = async (hash) => {
  try {
    if(!hash) return "empty hash";    
    const data = Buffer.from(hash, 'base64').toString('ascii');
    return JSON.parse(data);

  } catch (error) {
    return error;
  }
}

const createCardCustomer = async (customerId, data) => {
  try {
    if(!data) return false;
    if(!customerId) return false;
    return axios.post(`${HOST}/customers/${customerId}/cards`, data, HEADERS)
      .then(e => e.data)
      .catch(error => error.response.data);

  } catch (error) {
    return error;
  }
}

const getCardsCustomer = async (customerId) => {
  try {
    if(!customerId) return false;
    return axios.get(`${HOST}/customers/${customerId}/cards`, HEADERS)
      .then(e => e.data)
      .catch(error => error.response.data);

  } catch (error) {
    return error;
  }
}


const createSubscriptionPlan = async (data) => {
  try {
    if(!data) return false;
    return axios.post(`${HOST}/subscriptions`, data, HEADERS)
      .then(e => e.data)
      .catch(error => error.response.data);

  } catch (error) {
    return error;
  }
}

const cancelSubscriptionPlan = async (planId) => {
  try {
    if(!planId) return false;
    return axios.delete(`${HOST}/subscriptions/${planId}`, HEADERS)
      .then(e => e.data)
      .catch(error => error.response.data);

  } catch (error) {
    return error;
  }
}


const createOrder = async (data) => {
  try {
    if(!data) return false;
    return axios.post(`${HOST}/orders`, data, HEADERS)
      .then(e => e.data)
      .catch(error => error.response.data);

  } catch (error) {
    return error;
  }
}


module.exports = {
  getPlans,
  setPlan,
  deletePlan,
  putPlan,
  createCustomer,
  getCustomer,
  createTokenCard,
  createCardCustomer,
  getCustomHashCard,
  createCustomHashCard,
  createSubscriptionPlan,
  getCardsCustomer,
  createOrder,
  cancelSubscriptionPlan
};
