module.exports = ({ env }) => ({
  email: {
    enabled: false,
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
