'use strict';

const {
  singularizeEditorialTerm,
} = require('../editorial-intelligence/editorial-key');

const buildWorkspaceKey = (value = '') => {
  return singularizeEditorialTerm(value)
    .split(' ')
    .filter(Boolean)
    .join('-');
};

const workspaceKeyToName = (workspaceKey = '') => {
  const name = workspaceKey.replace(/-+/g, ' ').trim();

  return name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
};

const workspaceKeyToNormalizedName = (workspaceKey = '') => {
  return workspaceKey.replace(/-+/g, ' ').trim();
};

module.exports = {
  buildWorkspaceKey,
  workspaceKeyToName,
  workspaceKeyToNormalizedName,
};
