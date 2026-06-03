'use strict';

const axios = require('axios');
const passport = require('passport');
const GoogleStrategy = require('passport-token-google').Strategy;
const crypto = require('crypto')
const appleSigninAuth = require('apple-signin-auth');

passport.initialize();

const createUser = async (email) => {
  const pluginStore = await strapi.store({
    type: "plugin",
    name: "users-permissions",
  });
  const settings = await pluginStore.get({ key: "advanced" });

  const defaultRole = await strapi.db
        .query("plugin::users-permissions.role")
        .findOne({ where: { type: settings.default_role } });

  if (!defaultRole)
      throw new ApplicationError("Impossible to find the default role");

  let roleId = defaultRole.id;

  const newUserData = {
      role: roleId,
      email: email.toLowerCase(),
      username: email.toLowerCase(), 
      name: email?.split('@')?.[0]?.toLowerCase(), 
      surname: "", 
      type: 'pf',
      password: crypto.createHash('sha256').update(email).digest('hex'), 
      confirmed: true,
      phone: null,
      cpf: null,
      plate: null,
  };

  return await strapi.plugin("users-permissions").service("user").add(newUserData);
};

const loginObject = async (email) => {
  try {
    const user = await strapi.db.query("plugin::users-permissions.user").findOne({ where: { email } });

    const safeUser = !user ? await createUser(email) : user ;

    if (safeUser) {
      const jwtToken = strapi.plugins["users-permissions"].services.jwt.issue({ id: safeUser.id });
      delete safeUser.password;
      return {
        jwt: jwtToken,
        user: {}
      };
    }

    return {}

  } catch (error) {
    return error;
  }
};

const callback = async (accessToken, refreshToken, profile, done) => {
  try {
    if (!profile._json.email) done(null, false);

    const user = await loginObject(profile._json.email);
    done(null, user);

  } catch (error) {
    done(error, false, error.message)

  }
};

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET
}, callback));

module.exports = {
  loginFacebook: async (token) => {
    try {
      const url = `https://graph.facebook.com/me?access_token=${token}&fields=email`;

      return axios({
        method: 'GET',
        url: url
      }).then(async (response) => {
        return await loginObject(response.data.email);

      }).catch(function (error) {
        return error;
      });

    } catch (error) {
      return false;
    }
  },
  loginApple: async (id_token, nonce) => {
    try {

      const appleIdTokenClaims = await appleSigninAuth.verifyIdToken(id_token, {
        nonce: nonce ? crypto.createHash('sha256').update(nonce).digest('hex') : undefined,
      });

      return await loginObject(appleIdTokenClaims.email);

    } catch (error) {
      console.error(error)
      return error;

    }
  },
  login: (name, ctx) => {
    return new Promise((resolve, reject) => {
      passport.authenticate(name, { session: false }, async (error, user, info) => {
        if (error === null) {
          resolve(user)
        }
      })(ctx);
    })
  },
  customAuthSocial: async (token_social) => {
    const user = await strapi.db.query("plugin::users-permissions.user").findOne({
      where: {
        token_social
      }
    });

    if (user) {
      const jwtToken = strapi.plugins["users-permissions"].services.jwt.issue({ id: user.id });

      delete user.password;

      return {
        jwt: jwtToken,
        user
      };
    }

    return false
  }
};
