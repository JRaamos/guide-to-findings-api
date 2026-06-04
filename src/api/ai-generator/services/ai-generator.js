'use strict';

const aiGenerator = require('../../../services/ai-generator');

module.exports = () => ({
  async generatePage(payload) {
    return aiGenerator.generatePageFromRanking(strapi, payload);
  },
});
