'use strict';


const { APP_DEEPLINK, STORE_APPLE, STORE_GOOGLE } = process.env;


module.exports = {
  deeplink: async (ctx) => {
    const { params: params, state: { user: user }, request: { body: body, query: query, header } } = ctx;
    ctx.redirect(`${APP_DEEPLINK}${query.redirect}`);
  },
  store: async (ctx) => {
    const { params: params, state: { user: user }, request: { body: body, query: query, header } } = ctx;
    let ua = header['user-agent'];
    if (ua != null && (ua.indexOf("iPhone") !== -1 || ua.indexOf("iPad") !== -1 || ua.indexOf("iPod") !== -1 || ua.indexOf("Macintosh") !== -1)) {
      ctx.redirect(`${STORE_APPLE}`);
    } else {
      ctx.redirect(`${STORE_GOOGLE}`);
    }
  },
};