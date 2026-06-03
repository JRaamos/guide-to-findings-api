const { 
    setPlan,
  getPlans,
  deletePlan,
  putPlan,
  createCustomer,
  getCustomer,
  createTokenCard,
  createCardCustomer,
  createCustomHashCard,
  getCustomHashCard,
  getCardsCustomer,
  createOrder,
  cancelSubscriptionPlan
 } = require("./pagarme");

const sandbox_getPlans = async () => {

    // const planId = "plan_Q3DmAxDugu4ALWrK";
    // return await getPlans(planId);
  
    return await getPlans();
  }
  
  const sandbox_setPlan = async () => {
    const data = {
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
  
    return await setPlan(data);
  }
  
  const sandbox_putPlan = async () => {
  
    const planId = "plan_Q3DmAxDugu4ALWrK";
    const data = {
      "name": "Plano Silver",
      "description": "Esse plano oferece acesso aos programas de musculação e todos os equipamentos e atividades coletivas terrestres.",
      "currency": "BRL",
      "interval": "month",
      "interval_count": 3,
      "billing_type": "prepaid",
      "statement_descriptor": "SILVER",
      "minimum_price": 100,
      "status": "active",
      "payment_methods": ["credit_card"]
    }
  
    return await putPlan(planId, data);
  }
  
  
  const sandbox_deletePlans = async () => {
  
    const planId = "plan_Q3DmAxDugu4ALWrK";
    return await deletePlan(planId);
  }
  
  const sandbox_createCustomer = async () => {
  
    const data = {
      "name": "Tony Stark",
      "email": "tonystarkk@avengers.com",
      "code": "MY_CUSTOMER_001",
      "document": "123456789",
      "type": "individual",
      "gender": "male",
      "address": {
        "line_1": "375, Av. General Justo, Centro",
        "line_2": "8º andar",
        "zip_code": "20021130",
        "city": "Rio de Janeiro",
        "state": "RJ",
        "country": "BR"
      },
      "birthdate": "05/03/1984",
      "phones": {
        "home_phone": {
          "country_code": "55",
          "area_code": "21",
          "number": "000000000"
        },
        "mobile_phone": {
          "country_code": "55",
          "area_code": "21",
          "number": "000000000"
        }
      },
      "metadata": {
        "company": "Avengers"
      }
    };
    return await createCustomer(data);
  }
  
  
  const sandbox_getCustomer = async () => {
  
    const id = "cus_J3qvYxBSvSRlAyZ7";
    return await getCustomer(id);
  }
  
  const sandbox_getCardsCustomer = async () => {
  
    const id = "cus_J3qvYxBSvSRlAyZ7";
    return await getCardsCustomer(id);
  }
  
  const sandbox_createTokenCard = async () => {
  
    const data = {
      "type": "card",
      "card": {
        "number": "4000000000000010",
        "holder_name": "Token teste",
        "exp_month": 1,
        "exp_year": 25,
        "cvv": "651",
      }
    }
    return await createTokenCard(data);
  }
  
  const sandbox_createCustomHashCard = async () => {
  
    const data = {
      "number": "5508 5379 2956 6120",
      "holder_name": "Token teste",
      "exp_month": 3,
      "exp_year": 25,
      "cvv": "557",
      "brand": "Mastercard",
    }
    return await createCustomHashCard(data);
  }
  
  const sandbox_getCustomHashCard = async () => {
  
    const hash = "eyJudW1iZXIiOiI1NTA4IDUzNzkgMjk1NiA2MTIwIiwiaG9sZGVyX25hbWUiOiJUb2tlbiB0ZXN0ZSIsImV4cF9tb250aCI6MywiZXhwX3llYXIiOjI1LCJjdnYiOiI1NTciLCJicmFuZCI6Ik1hc3RlcmNhcmQifQ=="
    return await getCustomHashCard(hash);
  }
  
  const sandbox_createCardCustomer = async () => {
  
    var card = await sandbox_getCustomHashCard();
  
    const id = "cus_J3qvYxBSvSRlAyZ7";
    const data = {
      "private_label": false,
      "billing_address": {
        "line_1": "375, Av. General Osorio, Centro",
        "line_2": "7º Andar",
        "zip_code": "22000011",
        "city": "Rio de Janeiro",
        "state": "RJ",
        "country": "BR"
      },
      "options": {
        "verify_card": false
      }
    }
  
    const payload = Object.assign(card, data);
  
    // return await createCardCustomer(id, payload);
  
    return {
      "id": "card_Pqr2EpnuWuaLM5R0",
      "first_six_digits": "516292",
      "last_four_digits": "0666",
      "brand": "Mastercard",
      "holder_name": "Lolosa",
      "holder_document": "93095135270",
      "exp_month": 2,
      "exp_year": 2032,
      "status": "active",
      "type": "credit",
      "created_at": "2024-02-21T08:38:25Z",
      "updated_at": "2024-02-21T08:38:25Z",
      "billing_address": {
        "zip_code": "22000011",
        "city": "Rio de Janeiro",
        "state": "RJ",
        "country": "BR",
        "line_1": "375, Av. General Osorio, Centro",
        "line_2": "7º Andar"
      },
      "customer": {
        "id": "cus_J3qvYxBSvSRlAyZ7",
        "name": "Tony Stark",
        "email": "tonystarkk@avengers.com",
        "code": "MY_CUSTOMER_001",
        "document": "123456789",
        "type": "individual",
        "gender": "male",
        "delinquent": false,
        "created_at": "2024-02-18T23:36:37Z",
        "updated_at": "2024-02-18T23:36:37Z",
        "birthdate": "1984-05-03T00:00:00Z",
        "phones": {
          "home_phone": {
            "country_code": "55",
            "number": "000000000",
            "area_code": "21"
          },
          "mobile_phone": {
            "country_code": "55",
            "number": "000000000",
            "area_code": "21"
          }
        },
        "metadata": {
          "company": "Avengers"
        }
      }
    }
  
  }
  
  
  const sandbox_createSubscriptionPlan = async () => {
  
    const data = {
      "plan_id": "plan_Q3DmAxDugu4ALWrK",
      "payment_method": "credit_card",
      "customer": {
        "name": "Tony Stark",
        "email": "tonystark@avengers.com"
      },
      "card": {
        "holder_name": "Tony Stark",
        "number": "4532464862385322",
        "exp_month": 1,
        "exp_year": 23,
        "cvv": "903"
      }
    }
  
    return await createSubscriptionPlan(data);
  }
  
  
  const sandbox_cancelSubscriptionPlan = async () => {
  
    const planId = "plan_Q3DmAxDugu4ALWrK";
  
    return await cancelSubscriptionPlan(planId);
  }
  
  
  const sandbox_createOrder = async () => {
  
    const data = {
      "items": [
        {
          "amount": 2990,
          "description": "Avulso",
          "quantity": 1,
          "code": 1
        }
      ],
      "customer": {
        "name": "Tony Stark",
        "type": "individual",
        "email": "avengerstark@ligadajustica.com.br",
        "document": "03154435026",
        "document_type": "CPF"
      },
      "payments": [
        {
          "payment_method": "credit_card",
          "credit_card": {
            "recurrence": false,
            "installments": 1,
            "statement_descriptor": "AVENGERS",
            "card": {
              "number": "4000000000000010",
              "holder_name": "Tony Stark",
              "exp_month": 1,
              "exp_year": 22,
              "cvv": "3531",
              "billing_address": {
                "line_1": "10880, Malibu Point, Malibu Central",
                "zip_code": "90265",
                "city": "Malibu",
                "state": "CA",
                "country": "US"
              }
            }
          }
        }
      ]
    }
  
    return await createOrder(data);
  }
  
  module.exports = {
    sandbox_createOrder,
    sandbox_cancelSubscriptionPlan,
    sandbox_createSubscriptionPlan,
    sandbox_createCardCustomer,
    sandbox_getCustomHashCard,
    sandbox_createCustomHashCard,
    sandbox_createTokenCard,
    sandbox_getCardsCustomer,
    sandbox_getCustomer,
    sandbox_createCustomer,
    sandbox_deletePlans,
    sandbox_putPlan,
    sandbox_setPlan,
    sandbox_getPlans,

  }