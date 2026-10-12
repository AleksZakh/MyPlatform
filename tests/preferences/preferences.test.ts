import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultPreferences, preferencesPatchSchema, normalizePreferences, allowNotification } from '../../shared/utils/user-preferences';
test('preference input excludes identity and rejects invalid or excessive table settings', () => {
  assert.equal(preferencesPatchSchema.safeParse({ userId: 2, display: {} }).success, false);
  assert.equal(preferencesPatchSchema.safeParse({ display: { contrast: 'unknown' } }).success, false);
  assert.equal(preferencesPatchSchema.safeParse({ labTable: { visibleColumns: [], columnOrder: [] } }).success, false);
  assert.equal(preferencesPatchSchema.safeParse({ labTable: { visibleColumns: ['name'], columnOrder: Array(101).fill('name') } }).success, false);
  assert.equal(preferencesPatchSchema.safeParse({ notifications: { success: false } }).success, true);
  assert.deepEqual(normalizePreferences(null), defaultPreferences());
  assert.equal(defaultPreferences().display.textSize, 'normal');
  assert.equal(defaultPreferences().notifications.information, true);
});
test('errors and warnings remain enabled when optional notifications are disabled', () => {
  const n = { information: false, success: false, chatPopup: false, chatSound: false };
  for (const color of ['warning', 'error']) assert.equal(allowNotification(n, color), true);
  for (const color of ['info', 'success', 'neutral']) assert.equal(allowNotification(n, color), false);
});
