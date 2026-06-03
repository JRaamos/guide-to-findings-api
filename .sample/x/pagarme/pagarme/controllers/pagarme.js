'use strict';

const {
  cancelSubscriptionPlan,
  createCustomHashCard,
  createCustomer,
  createCardCustomer,
  getCustomHashCard,
  createSubscriptionPlan
} = require("../services/pagarme");
const {
  sandbox_cancelSubscriptionPlan
} = require("../services/sandbox");



const mockCard = () => {
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



module.exports = {
  sandbox: async (ctx, next) => {
    try {
      // plans
      // ctx.body = await sandbox_getPlans();
      // ctx.body = await sandbox_setPlan();
      // ctx.body = await sandbox_putPlan();
      // ctx.body = await sandbox_deletePlans();

      //customer
      // ctx.body = await sandbox_createCustomer();
      // ctx.body = await sandbox_getCustomer();

      //card
      // ctx.body = await sandbox_createTokenCard();
      // ctx.body = await sandbox_createCardCustomer();
      // ctx.body = await sandbox_getCardsCustomer();
      // ctx.body = await sandbox_createCustomHashCard();
      // ctx.body = await sandbox_getCustomHashCard();

      //payment
      // ctx.body = await sandbox_createSubscriptionPlan();
      // ctx.body = await sandbox_createOrder();
      // ctx.body = await sandbox_cancelSubscriptionPlan();



    } catch (e) {
      ctx.badRequest(e);
    }
  },
  createSubscription: async (ctx) => {
    try {
      const user = ctx.state.user;
      const { planId, cardId } = ctx.request.body;

      if (!user) return ctx.badRequest("no authorized");
      if (!planId) return ctx.badRequest("empty planId");
      if (!cardId) return ctx.badRequest("empty cardId");


      const card = await strapi.db.query('api::card.card').findOne({
        where: { id: cardId, user: user.id }
      });

      if (!card?.id) return ctx.badRequest("invalid card");


      const plan = await strapi.db.query('api::plan.plan').findOne({
        where: { id: planId }
      });

      if (!plan?.id) return ctx.badRequest("invalid plan");


      const data = {
        "plan_id": plan.plan_gateway_id,
        "payment_method": "credit_card",
        "customer": {
          "name": user.username,
          "email": user.email
        },
        "card": await getCustomHashCard(card.hash)
      }

      const subscription = await createSubscriptionPlan(data);

      if (subscription?.id) {
        return ctx.body = await strapi.db.query('api::order.order').create({
          data: {
            user,
            card: cardId,
            plan: planId,
            data: subscription
          }
        });
      }

      return ctx.body = await strapi.db.query('api::order.order').create({
        data: {
          user,
          card: cardId,
          plan: planId,
          data: subscription,
          status: ['fail']
        }
      });

    } catch (e) {
      ctx.badRequest(e);
    }
  },
  cancelSubscription: async (ctx) => {
    try {
      const { id } = ctx.query;

      if (!id) return ctx.badRequest("empty orderId");

      const order = await strapi.db.query('api::order.order').findOne({
        where: { id },
        populate: ["plan"]
      });

      if (!order?.id) return ctx.badRequest("invalid order");

      const cancel = await cancelSubscriptionPlan(order?.plan?.plan_gateway_id);

      return await strapi.db.query('api::order.order').update({
        where: { id },
        data: { 
          data: cancel,
          status: ["cancelled"],
        }
      });

    } catch (e) {
      ctx.badRequest(e);
    }
  },
  createCard: async (ctx) => {
    try {
      const user = ctx.state.user;
      const { number, holder_name, exp_month, exp_year, cvv, brand } = ctx.request.body;

      if (!number) return ctx.badRequest("empty number");
      if (!holder_name) return ctx.badRequest("empty holder_name");
      if (!exp_month) return ctx.badRequest("empty exp_month");
      if (!exp_year) return ctx.badRequest("empty exp_year");
      if (!cvv) return ctx.badRequest("empty cvv");
      if (!brand) return ctx.badRequest("empty brand");

      const hash = await createCustomHashCard({
        number,
        holder_name,
        exp_month,
        exp_year,
        cvv,
        brand
      });

      if (!hash?.token) return ctx.badRequest("error in create hash card");

      const customerGateway = await createCustomer({
        "name": user.username,
        "email": user.email,
        "code": `vezos_customer_${user.id}`,
        "document": user?.cpf,
        "type": "individual",
        "address": {
          "line_1": user?.address?.street || "Rua São Paulo, 222",
          "line_2": user?.address?.number,
          "zip_code": user?.address?.zipcode || "00089290",
          "city": user?.address?.city || "São Paulo",
          "state": user?.address?.uf || "SP",
          "country": "BR"
        },
        "phones": {
          "mobile_phone": {
            "country_code": "55",
            "area_code": user?.phone?.substr(0, 2),
            "number": user?.phone?.substr(2)
          }
        }
      });

      if (!customerGateway?.id) return ctx.badRequest("error in create customer gateway");

      const cardObject = await getCustomHashCard(hash.token);

      const payload = Object.assign({
        "private_label": false,
        "billing_address": {
          "line_1": user?.address?.street || "Rua São Paulo, 222",
          "line_2": user?.address?.number,
          "zip_code": user?.address?.zipcode || "00089290",
          "city": user?.address?.city || "São Paulo",
          "state": user?.address?.uf || "SP",
          "country": "BR"
        },
        "options": {
          "verify_card": false
        }
      }, cardObject);

      const customerCard = await createCardCustomer(customerGateway.id, payload);
      // TODO mock test card
      // const mockCustomerCard = mockCard();

      if (customerCard?.message == "Could not create credit card. The card verification failed.") {
        return ctx.badRequest(customerCard.message);
      }

      ctx.body = await strapi.db.query("api::card.card").create({
        data: {
          user: user.id,
          hash: hash?.token,
          customer_gateway: customerGateway,
          customer_card_gateway: customerCard
        }
      });

    } catch (e) {
      ctx.badRequest(e);
    }
  },
};
