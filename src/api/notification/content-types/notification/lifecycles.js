"use strict";

const { dispatchPush } = require("../../../../../functions/push");

module.exports = {
    async afterCreate(event) {
        const { result } = event;
        // do something    
        const register = await strapi.documents("api::notification.notification").findOne({ 
            documentId: result.documentId,
            populate: {
                user: true
            }
        }) 

        const target_devices = await strapi.documents("api::devicetoken.devicetoken").findMany( !register?.user?.id ? {} : {
            where: {
                user: register?.user?.id
            }
        });

        const promises = target_devices?.map(m => dispatchPush(m?.token, result?.title, result?.text, {}) )
        await Promise.all(promises)
        await strapi.documents("api::notification.notification").update({ 
            documentId: result.documentId, 
            data: { 
                processed: true 
            } 
        })

    },
    async beforeDelete(event) {
        const { result } = event;
        // do something    
    },
};
