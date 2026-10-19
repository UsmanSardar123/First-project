const assert = require('node:assert/strict');
const test = require('node:test');
const app = require('./server');

test('expense creation endpoint is registered for POST /api/expenses', () => {
  const route = app._router.stack.find((layer) => layer.route?.path === '/api/expenses');

  assert.ok(route, 'the expense endpoint should be registered');
  assert.equal(route.route.methods.post, true);
});

test('unknown endpoints receive a JSON 404 handler', () => {
  const handler = app._router.stack.at(-1);

  assert.equal(handler.route, undefined);
  assert.equal(typeof handler.handle, 'function');
});
