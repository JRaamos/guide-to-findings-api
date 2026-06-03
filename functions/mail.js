'use strict';

const fs = require('fs');
const _ = require('lodash');

const  sentEmail = async (to, subject, html)  => { 
    return await strapi.plugins['email'].services.email.send({ to, subject, html });
}

const dispatchMail = async (user, message) => {
  const emailTemplate = {
      subject: 'Bem vindo ao EvoTTF, <%= user.name %>',
      html: message,
      text: message,
  };
    
  await strapi.plugins.email.services.email.sendTemplatedEmail(
      { to: user.email }, emailTemplate,
      { user: _.pick(user, ['username', 'email', 'name']), }
  );
}


module.exports = {
    dispatchMail,
    sentEmail
};
