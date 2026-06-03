'use strict';

/**
 * me service
 */

const PROFILE_FIELDS = ['phone', 'cpf', 'name', 'image', 'address'];
const cleanObject = (payload = {}) => {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => typeof value !== 'undefined')
  );
};

module.exports = () => ({
  getProfileFields() {
    return PROFILE_FIELDS;
  },

  splitPayload(payload = {}) {
    const userData = {};
    const profileData = {};

    Object.entries(payload || {}).forEach(([key, value]) => {
      if (PROFILE_FIELDS.includes(key)) {
        profileData[key] = value;
        return;
      }

      userData[key] = value;
    });

    return {
      userData: cleanObject(userData),
      profileData: cleanObject(profileData),
    };
  },

  async readUserWithProfile(userId) {
    return strapi.entityService.findOne('plugin::users-permissions.user', userId, {
      populate: {
        profile: {
          populate: {
            image: true,
          },
        },
      },
    });
  },

  serializeMeResponse(register) {
    if (!register) {
      return register;
    }

    const profile = register.profile || {};
    const response = {
      ...register,
      ...cleanObject({
        phone: profile.phone,
        cpf: profile.cpf,
        name: profile.name,
        image: profile.image,
        address: profile.address,
      }),
    };

    delete response.password;
    delete response.profile;

    return response;
  },

  async ensureProfile(userId) {
    const already = await strapi.db.query('api::profile.profile').findOne({
      where: {
        user: userId,
      },
    });

    if (already) {
      return already;
    }

    return strapi.entityService.create('api::profile.profile', {
      data: {
        user: userId,
      },
    });
  },

  async saveProfile(userId, payload = {}) {
    const hasProfileData = Object.keys(payload).length > 0;
    if (!hasProfileData) {
      return this.ensureProfile(userId);
    }

    const currentProfile = await this.ensureProfile(userId);

    return strapi.entityService.update('api::profile.profile', currentProfile.id, {
      data: {
        ...payload,
        user: userId,
      },
      populate: {
        image: true,
      },
    });
  },

  async removeProfile(userId) {
    const currentProfile = await strapi.db.query('api::profile.profile').findOne({
      where: {
        user: userId,
      },
    });

    if (!currentProfile) {
      return null;
    }

    return strapi.entityService.delete('api::profile.profile', currentProfile.id);
  },
});
