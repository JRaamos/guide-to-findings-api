import type { Schema, Struct } from '@strapi/strapi';

export interface UserAddress extends Struct.ComponentSchema {
  collectionName: 'components_user_addresses';
  info: {
    displayName: 'address';
  };
  attributes: {
    city: Schema.Attribute.String;
    complement: Schema.Attribute.String;
    neighborhood: Schema.Attribute.String;
    number: Schema.Attribute.BigInteger;
    state: Schema.Attribute.String;
    street: Schema.Attribute.String;
    uf: Schema.Attribute.Enumeration<
      [
        'AC',
        'AL',
        'AM',
        'AP',
        'BA',
        'CE',
        'DF',
        'ES',
        'GO',
        'MA',
        'MG',
        'MS',
        'MT',
        'PA',
        'PB',
        'PE',
        'PI',
        'PR',
        'RJ',
        'RN',
        'RO',
        'RR',
        'RS',
        'SC',
        'SE',
        'SP',
        'TO',
      ]
    >;
    zipcode: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'user.address': UserAddress;
    }
  }
}
