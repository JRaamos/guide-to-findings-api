import AuthLogo from './extensions/auth_logo.png';
import MenuLogo from './extensions/menu_logo.png';
import favicon from './extensions/favicon.ico';
import PT_BR from './extensions/Translate/pt';
import { ShoppingCart } from '@strapi/icons';



PT_BR['app.components.LeftMenu.navbrand.title'] = 'Guide to findings';
PT_BR['app.components.LeftMenu.navbrand.workplace'] = 'Backoffice';
PT_BR['Auth.form.welcome.title'] = ' ';
PT_BR['Auth.form.welcome.subtitle'] = 'Backoffice';
PT_BR['mercado-livre.menu.label'] = 'Mercado Livre';


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
  app.addMenuLink({
    to: '/mercado-livre',
    icon: ShoppingCart,
    intlLabel: {
      id: 'mercado-livre.menu.label',
      defaultMessage: 'Mercado Livre',
    },
    Component: async () => {
      const component = await import('./admin/MercadoLivrePage');

      return { default: component.default };
    },
    permissions: [],
    position: 3,
  });
};

export default {
  config,
  bootstrap,
};
