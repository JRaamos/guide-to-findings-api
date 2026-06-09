import AuthLogo from './extensions/auth_logo.png';
import MenuLogo from './extensions/menu_logo.png';
import favicon from './extensions/favicon.ico';
import PT_BR from './extensions/Translate/pt';
import { CheckCircle, ShoppingCart } from '@strapi/icons';



PT_BR['app.components.LeftMenu.navbrand.title'] = 'Guide to findings';
PT_BR['app.components.LeftMenu.navbrand.workplace'] = 'Backoffice';
PT_BR['Auth.form.welcome.title'] = ' ';
PT_BR['Auth.form.welcome.subtitle'] = 'Backoffice';
PT_BR['ranking-generator.menu.label'] = 'Gerador de Rankings';
PT_BR['publication-workflow.menu.label'] = 'Revisoes Necessarias';


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
    to: '/ranking-generator',
    icon: ShoppingCart,
    intlLabel: {
      id: 'ranking-generator.menu.label',
      defaultMessage: 'Gerador de Rankings',
    },
    Component: async () => {
      const component = await import('./admin/MercadoLivrePage');

      return { default: component.default };
    },
    permissions: [],
    position: 3,
  });

  app.addMenuLink({
    to: '/publication-workflow',
    icon: CheckCircle,
    intlLabel: {
      id: 'publication-workflow.menu.label',
      defaultMessage: 'Revisoes Necessarias',
    },
    Component: async () => {
      const component = await import('./admin/PublicationWorkflowPage');

      return { default: component.default };
    },
    permissions: [],
    position: 6,
  });
};

export default {
  config,
  bootstrap,
};
