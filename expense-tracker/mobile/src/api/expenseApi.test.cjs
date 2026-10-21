/* eslint-env node */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');

test('EXPO_PUBLIC_API_URL targets the Android emulator expense endpoint', () => {
  const env = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  const setting = env.split(/\r?\n/).find((line) => line.startsWith('EXPO_PUBLIC_API_URL='));

  assert.ok(setting, 'EXPO_PUBLIC_API_URL must be configured');
  assert.equal(
    new URL(setting.slice('EXPO_PUBLIC_API_URL='.length)).toString(),
    'http://10.0.2.2:5001/api/expenses',
  );
});
