import test from 'node:test';
import assert from 'node:assert/strict';
import { appVersion } from '../server/services/app-version';

test('Running release and activation timestamp only; no secrets or invented install time', () => {
  const env = { NODE_ENV: 'production', SPACE_RELEASE_ID: '20261103T100000Z-012345abcdef', SPACE_RELEASE_INSTALLED_AT: '2026-11-03T12:30:00Z', DATABASE_URL: 'secret' };
  assert.deepEqual(appVersion(env), { application: 'Space / MyPlatform', release: env.SPACE_RELEASE_ID, commit: '012345abcdef', installedAt: '2026-11-03T12:30:00.000Z', environment: 'production' });
  assert.equal(appVersion({ ...env, SPACE_RELEASE_INSTALLED_AT: undefined }).installedAt, null);
  assert.equal(appVersion({ ...env, SPACE_RELEASE_INSTALLED_AT: 'yesterday' }).installedAt, null);
  assert.equal(appVersion({ ...env, SPACE_RELEASE_ID: '../../etc/passwd' }).release, null);
  assert.equal(appVersion({ ...env, SPACE_RELEASE_ID: undefined }).installedAt, null);
  assert.equal(appVersion({}).environment, 'development');
});
