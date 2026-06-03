'use strict';

/**
 * sms-service service
 */

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const defaultFrom = process.env.TWILIO_DEFAULT_FROM;
const client = require('twilio')(accountSid, authToken);


const send = async (code, phone) => {
  return await client.messages.create({
    from: defaultFrom,
    to: phone,
    body: `bachega: ${code}`
  }).then(message => { return { sid: message.sid } })
    .catch(e => e)
}

module.exports = {
  send
};