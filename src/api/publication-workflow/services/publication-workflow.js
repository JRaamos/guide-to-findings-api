'use strict';

const publicationWorkflow = require('../../../services/publication-workflow');

module.exports = () => ({
  async listPages() {
    return publicationWorkflow.listPages(strapi);
  },

  async getPage(id) {
    return publicationWorkflow.getPage(strapi, id);
  },

  async approvePage(id) {
    return publicationWorkflow.approvePage(strapi, id);
  },

  async publishPage(id) {
    return publicationWorkflow.publishPage(strapi, id);
  },
});
