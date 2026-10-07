import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRuntimeEnvironment } from '../../scripts/runtime-env.mjs';
test('runtime aliases preserve explicit Nuxt overrides and map old AD names', () => {
  const env = { AD_PASSWORD: 'test-only', AD_URL: 'ldap://test', AD_DOMAIN_USERS: 'dc=test', NUXT_AD_URL: 'ldap://explicit', FILE_STORAGE_PATH: '/test/files' };
  applyRuntimeEnvironment(env);
  assert.equal(env.NUXT_AD_PASSWORD, 'test-only');
  assert.equal(env.NUXT_AD_URL, 'ldap://explicit');
  assert.equal(env.NUXT_AD_BASE_DN, 'dc=test');
  assert.equal(env.NUXT_PUBLIC_FILE_STORAGE_MOUNT, '/test/files');
});
