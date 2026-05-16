import assert from 'node:assert/strict';
import test from 'node:test';
import { StemixClient, StemixPage, rootRouteRef, stemixPlugin } from './index';
import backendFeature, {
  createStemixGreeting,
  getStemixPartOfDay,
  stemixBackendPlugin,
} from './backend';

test('public root export surfaces the frontend plugin API', () => {
  assert.equal(typeof StemixClient, 'function');
  assert.equal(typeof StemixPage, 'function');
  assert.equal(typeof stemixPlugin, 'object');
  assert.equal(typeof rootRouteRef, 'object');
});

test('public backend subpath surfaces the backend feature API', () => {
  assert.equal(backendFeature, stemixBackendPlugin);
  assert.equal(typeof createStemixGreeting, 'function');
  assert.equal(getStemixPartOfDay(new Date(2026, 4, 16, 9, 0, 0)), 'morning');
});
