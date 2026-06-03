module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'sendgrid',
      providerOptions: {
        apiKey: env('SENDGRID_API_KEY'),
      },
      settings: {
        defaultFrom: env('MAIL_DEFAULT_FROM'),
        defaultReplyTo: env('MAIL_DEFAULT_REPLY_TO'),
      },
    },
  },
  "users-permissions": {
    config: {
        register: {
            allowedFields: [
                "name",
                "phone",
                "cpf"
            ],
        },
    },
  }
});