import AuthLogo from './extensions/auth_logo.png';
import MenuLogo from './extensions/menu_logo.png';
import favicon from './extensions/favicon.ico';
import PT_BR from './extensions/Translate/pt';
import { CheckCircle, Magic, PresentationChart, ShoppingCart } from '@strapi/icons';



PT_BR['app.components.LeftMenu.navbrand.title'] = 'Guide to findings';
PT_BR['app.components.LeftMenu.navbrand.workplace'] = 'Backoffice';
PT_BR['Auth.form.welcome.title'] = ' ';
PT_BR['Auth.form.welcome.subtitle'] = 'Backoffice';
PT_BR['mercado-livre.menu.label'] = 'Mercado Livre';
PT_BR['ranking-builder.menu.label'] = 'Ranking Builder';
PT_BR['ai-generator.menu.label'] = 'AI Generator';
PT_BR['publication-workflow.menu.label'] = 'Publication Workflow';


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

  app.addMenuLink({
    to: '/ranking-builder',
    icon: PresentationChart,
    intlLabel: {
      id: 'ranking-builder.menu.label',
      defaultMessage: 'Ranking Builder',
    },
    Component: async () => {
      const component = await import('./admin/RankingBuilderPage');

      return { default: component.default };
    },
    permissions: [],
    position: 4,
  });

  app.addMenuLink({
    to: '/ai-generator',
    icon: Magic,
    intlLabel: {
      id: 'ai-generator.menu.label',
      defaultMessage: 'AI Generator',
    },
    Component: async () => {
      const component = await import('./admin/AiGeneratorPage');

      return { default: component.default };
    },
    permissions: [],
    position: 5,
  });

  app.addMenuLink({
    to: '/publication-workflow',
    icon: CheckCircle,
    intlLabel: {
      id: 'publication-workflow.menu.label',
      defaultMessage: 'Publication Workflow',
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
