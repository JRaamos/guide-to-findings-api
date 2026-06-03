'use strict';

/**
 * user.js controller
 *
 * @description: A set of functions called "actions" of the `user` plugin.
 */

const bcrypt = require('bcryptjs');
// const { sanitizeEntity } = require('strapi-utils');
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const _ = require('lodash');
const axios = require('axios');
var request = require('request').defaults({ encoding: null });

const { CredentialsManager } = require('./tokenclass')
// console.log("🐌🧲 ~ file: docusign.js:17 ~ CredentialsManager:", CredentialsManager)

var docusignToken = ''
var docusignRefreshToken = ''

const manager = new CredentialsManager(
    docusignToken,
    docusignRefreshToken
)

const requestPromise = async (userSign, token, accountId) => new Promise((resolve, reject) => {
    try {
        request(userSign?.file?.url, async function (error, response, body) {
            if (error) {
                reject(error)
            }
            if (!error && response.statusCode == 200) {
                const document64 = Buffer.from(body).toString('base64')
                let envelope = await axios({
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'Authorization': `Bearer ${token}`

                    },
                    data: {
                        "documents": [
                            {
                                "documentBase64": document64,
                                "documentId": userSign?.id,
                                "fileExtension": "pdf",
                                "name": "document"
                            }
                        ],
                        "emailSubject": userSign?.title,
                        "recipients": {
                            "signers": [
                                {
                                    "email": userSign?.user.email,
                                    "name": userSign?.user.username,
                                    "recipientId": userSign?.user.id
        
                                }
                            ]
                        },
                        "status": "sent"
                    },
                    url: `${process.env.DOCUSIGN_URL}/restapi/v2.1/accounts/${accountId}/envelopes`
                }).then((response) => {
                    return response.data;
                }).catch((err) => {
                    console.log(err?.response?.data, 'error during ')
                    resolve(err)
                })
                resolve(envelope)

            }
        })
    } catch (error) {
        console.log(error, 'error during requestPromise')
        reject(error)
    }

})

const getNewRefreshToken = async () => {
    try {
        let tokenIntegrate = process.env.DOCUSIGN_INTEGRATE;
        let tokenSecret = process.env.DOCUSIGN_SECRET;
        // console.log(docusignToken, 'docusign existing token')
        // console.log()
        const { token, refresh } = manager.getCredentials()
        let buff = new Buffer(`${tokenIntegrate}:${tokenSecret}`);
        let base64data = buff.toString('base64');
        let options = {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'Authorization': `Basic ${base64data}`

            },
            data: {
                "refresh_token": refresh
            },
            url: `${process.env.DOCUSIGN_URL_AUTH}/oauth/token`
        }

        let response = await axios(options).then((response) => {
            return response.data;
        }).catch((err) => {
            return { "error": err }
        })
        if (response.refresh_token) manager.setCredentials(
            response.access_token,
            response.refresh_token
        )
    } catch (error) {
        console.log(error, 'error during refresh token')
    }
}

module.exports = {
    callback: async (ctx) => {
        try {
            const { code } = ctx.request.query;

            let tokenIntegrate = process.env.DOCUSIGN_INTEGRATE;
            let tokenSecret = process.env.DOCUSIGN_SECRET;

            let buff = new Buffer(`${tokenIntegrate}:${tokenSecret}`);
            let base64data = buff.toString('base64');

            let options = {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'Authorization': `Basic ${base64data}`

                },
                data: {
                    "code": code,
                    "grant_type": "authorization_code"
                },
                url: `${process.env.DOCUSIGN_URL_AUTH}/oauth/token`
            }

            let access = await axios(options).then((response) => {
                return response.data;
            }).catch((err) => {
                console.log('error')
                return { "error": err }
            })
            manager.setCredentials(access.access_token, access.refresh_token)

            return ctx.send({ message: "send ok" });

        } catch (error) {
            console.log(error, 'error + not found')
            return ctx.badRequest("not found");

        }
    },
    send: async (ctx) => {
        try {
            
            await getNewRefreshToken()
            let usersSignature = await strapi.query("signatures").find({ sent: false });

            const { token } = manager.getCredentials()

            for (var user in usersSignature) {
                const sign = usersSignature[user]
                if (usersSignature[user]?.user && sign?.file !== null) {
                    let accountId = process.env.DOCUSIGN_ACCOUNT_ID;
                    const envelope = await requestPromise(
                        sign,
                        token,
                        accountId
                    )

                    if (envelope?.envelopeId) {
                        await strapi.query("signatures").update({
                            id: usersSignature[user].id
                        }, {
                            sent: true,
                            structure: envelope
                        })
                    }


                }
            }
            // console.log(manager.getCredentials())
            return ctx.send('Done')

        } catch (error) {
            console.log(error)
            return ctx.badRequest("not found");

        }
    },
};

