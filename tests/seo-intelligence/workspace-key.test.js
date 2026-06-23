'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildWorkspaceKey,
} = require('../../src/services/seo-intelligence/workspace-key');

test('canonicalizes singular and plural workspace names', () => {
  assert.equal(buildWorkspaceKey('Notebook'), 'notebook');
  assert.equal(buildWorkspaceKey('Notebooks'), 'notebook');
  assert.equal(buildWorkspaceKey('Air Fryer'), 'air-fryer');
  assert.equal(buildWorkspaceKey('Air Fryers'), 'air-fryer');
  assert.equal(buildWorkspaceKey('Cadeiras Gamer'), 'cadeira-gamer');
});

test('removes accents and collapses whitespace in workspace keys', () => {
  assert.equal(buildWorkspaceKey('  Cadeiras   Ergonômicas  '), 'cadeira-ergonomica');
});
