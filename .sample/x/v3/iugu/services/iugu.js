'use strict';

const axios = require('axios');


/**
 * 
 * @param {*} {
        "email": "jose_silva@teste.com",
        "name": "José",
        "notes": "",
        "phone": "999999999",
        "phone_prefix": "011",
        "cpf_cnpj": "02163033031",
        "cc_emails": "jose_2@teste.com",
        "zip_code": "01310-100",
        "number": "1048",
        "street": "Avenida Paulista",
        "city": "São Paulo",
        "state": "São Paulo",
        "district": "Bela Vista",
        "complement": "55b",
        "custom_variables": [
            {
                "name": "José",
                "chave": "valor"
            }
        ]
      } 
 * @returns object
 */
const createCustomer = async (data) => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/customers?api_token=${process.env.IUGU_TOKEN_API}`

    return axios({
      method: 'post',
      url: url,
      data: data
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return false;
    
  }
}


const findCustomers = async () => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/customers?api_token=${process.env.IUGU_TOKEN_API}`

    return axios({
      method: 'get',
      url: url
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return false;
    
  }
}


/**
 * @param {*} id 
 * @returns object
 */
const findCustomerById = async (id) => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/customers/${id}?api_token=${process.env.IUGU_TOKEN_API}`

    return axios({
      method: 'get',
      url: url
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return false;
    
  }
}


/**
 * 
 * @param {*} id 
 * @returns object
 */
const deleteCustomer = async (id) => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/customers/${id}?api_token=${process.env.IUGU_TOKEN_API}`

    return axios({
      method: 'delete',
      url: url
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return false;
    
  }
}


/**
 * 
 * @param {*} payload {"name": "Plano Básico", "interval": 1, "interval_type": "months",
 "value_cents": 1000, "payable_with": "all", "features": [], "billing_days": 10}
 *  
 * @returns object
 */
const createPlan = async (payload) => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/plans?api_token=${process.env.IUGU_TOKEN_API}`

    return axios({
      method: 'post',
      url: url,
      data: payload
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return false;
    
  }
}


/**
 * 
 * @param {*} id 
 * @param {*} payload {"name": "Plano Básico", "interval": 1, "interval_type": "months",
 "value_cents": 1000, "payable_with": "all", "features": [], "billing_days": 10}
 *  
 * @returns object
 */
const updatePlan = async (id, payload) => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/plans/${id}?api_token=${process.env.IUGU_TOKEN_API}`

    return axios({
      method: 'put',
      url: url,
      data: payload
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return false;
    
  }
}


const deletePlan = async (id) => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/plans/${id}?api_token=${process.env.IUGU_TOKEN_API}`

    return axios({
      method: 'delete',
      url: url
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return false;
    
  }
}


const getPlan = async (id) => {
  try {
    let url = null;

    if (id) {
      url = `${process.env.IUGU_HOST}/v1/plans/${id}?api_token=${process.env.IUGU_TOKEN_API}`
    } else {
      url = `${process.env.IUGU_HOST}/v1/plans?api_token=${process.env.IUGU_TOKEN_API}`
    }
    
    
    return axios({
      method: 'get',
      url: url
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return false;
    
  }
}


/**
 * @param {*} test "true"
 * @param {*} payload {
        "number": "4111111111111111",
        "verification_value": "213",
        "first_name": "José",
        "last_name": "Silva",
        "month": "05",
        "year": "2026"
    }
}
 * @returns object
 */
const createHashCreaditCard = async (payload) => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/payment_token`

    let data = {
      "account_id": process.env.IUGU_ACCOUNT_ID,
      "method": "credit_card",
      "test": process.env.IUGU_ENV_TEST,
      "data": payload
    }

    return axios({
      method: 'POST',
      url: url,
      data: data
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return false;
    
  }
}


/**
 * 
 * @param {*} customerId 
 * @param {*} hash 
 * @returns object
 */
const createOptionPaymentCustomerCreditCard = async (customerId, hash) => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/customers/${customerId}/payment_methods?api_token=${process.env.IUGU_TOKEN_API}`

    let data = {
        "description": "creditcard",
        "token":  hash,
        "set_as_default": true
    }

    return axios({
      method: 'POST',
      url: url,
      data: data
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return false;
    
  }
}


/**
 * 
 * @param {*} customerId 
 * @param {*} idPayment 
 * @returns object
 */
 const deleteOptionPaymentCustomerCreditCard = async (customerId, idPayment) => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/customers/${customerId}/payment_methods/${idPayment}?api_token=${process.env.IUGU_TOKEN_API}`

    return axios({
      method: 'DELETE',
      url: url
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return false;
    
  }
}


const getMethodsByCustomer = async (customerId) => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/customers/${customerId}/payment_methods?api_token=${process.env.IUGU_TOKEN_API}`

    return axios({
      method: 'GET',
      url: url
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return false;
    
  }
}



/**
 * 
 * @param {*} payload {
    "plan_identifier": "fdsafdsa",
    "customer_id": "f8d7s97f9ds87f9s7fd7s9",    
    "expires_at": null,
    "only_on_charge_success": null,
    "ignore_due_email": null,
    "payable_with": "all",
    "credits_based": false,
    "price_cents": 200,
    "credits_cycle": null,
    "credits_min": 0,
    "subitems": [{
        "description": "Item um",
        "price_cents": 1000,
        "quantity": 1,
        "recurrent": true
    }],
    "custom_variables":[],
    "two_step": false,
    "suspend_on_invoice_expired": false
}
 * @returns object
 */
const createSubscription = async (payload) => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/subscriptions?api_token=${process.env.IUGU_TOKEN_API}`

    return axios({
      method: 'post',
      url: url,
      data: payload
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return false;
    
  }
}


/**
 * 
 * @param {*} subscriptionId 
 * @returns 
 */
const suspendSubscription = async (subscriptionId) => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/subscriptions/${subscriptionId}/suspend?api_token=${process.env.IUGU_TOKEN_API}`

    return axios({
      method: 'post',
      url: url,
      data: {}
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return false;
    
  }
}


/**
 * 
 * @param {*} customerId 
 * @returns 
 */
const getSubscription = async (customerId) => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/subscriptions?api_token=${process.env.IUGU_TOKEN_API}&customer_id=${customerId}`

    return axios({
      method: 'get',
      url: url
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return false;
    
  }
}


/**
 * 
 * @param {*} invoiceId 
 * @returns 
 */
 const refundInvoice = async (invoiceId) => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/invoices/${invoiceId}/refund?api_token=${process.env.IUGU_TOKEN_API}`

    return axios({
      method: 'post',
      url: url
    }).then(function (response) {
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return error;
    
  }
}


/**
 * 
 * @param {*} {
                
                "token": hash card,
                "customer_id": gateway id
                "items": [
                    {
                        "description": "xxxxxxx",
                        "quantity": 1,
                        "price_cents": 0000
                    }
                ]
            } 
 * @returns 
 */
 const directPayment = async (data) => {
  try {
    let url = `${process.env.IUGU_HOST}/v1/charge?api_token=${process.env.IUGU_TOKEN_API}`

    return axios({
      method: 'post',
      url: url,
      data: data,
      headers: {
        accept: 'application/json',
        contentType: 'application/json'
      }
    }).then(function (response) {
      
      return response.data;

    }).catch(function (error) {
      return error;

    });

  } catch (error) {
    return error;
    
  }
}

module.exports = {
  createCustomer,
  findCustomers,
  findCustomerById,
  deleteCustomer,
  createPlan,
  updatePlan,
  deletePlan,
  getPlan,
  createHashCreaditCard,
  createOptionPaymentCustomerCreditCard,
  deleteOptionPaymentCustomerCreditCard,
  getMethodsByCustomer,
  createSubscription,
  suspendSubscription,
  getSubscription,
  directPayment,
  refundInvoice
};
