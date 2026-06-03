import AuthLogo from './extensions/auth_logo.png';
import MenuLogo from './extensions/menu_logo.png';
import favicon from './extensions/favicon.ico';
import PT_BR from './extensions/Translate/pt';



PT_BR['app.components.LeftMenu.navbrand.title'] = 'Guide to findings';
PT_BR['app.components.LeftMenu.navbrand.workplace'] = 'Backoffice';
PT_BR['Auth.form.welcome.title'] = ' ';
PT_BR['Auth.form.welcome.subtitle'] = 'Backoffice';


const config = {
  locales: [
    'pt-BR',
  ],
  tutorials: false,
  notifications: {
    releases: false,
  },
  translations: {
    'pt-BR': PT_BR,
    en: PT_BR
  },
  auth: {
    logo: AuthLogo,
  },
  head: {
    favicon: favicon,
  },
  menu: {
    logo: MenuLogo,
  },
};

const bootstrap = (app) => {

};

export default {
  config,
  bootstrap,
};
