import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { phoneDirectoryAvatarUrls } from '../server/utils/phone-directory-avatars';

test('the phone book links to the same AD account used by the Space profile', () => {
  const urlFor = phoneDirectoryAvatarUrls([
    { userId: 42, avatarVersion: 'new-photo', user: { directoryObjectId: 'ABCD-1234', login: 'petrov' } },
  ]);
  assert.equal(urlFor({ directoryObjectId: 'abcd-1234', login: 'PETROV' }), '/api/contacts/avatars/42?v=new-photo');
  assert.equal(urlFor({ directoryObjectId: 'other-guid', login: 'petrov' }), null, 'a different AD identity must not reuse the photo');
  assert.equal(urlFor({ directoryObjectId: 'abcd-1234', login: '' }), '/api/contacts/avatars/42?v=new-photo');
});

test('old Space records without a GUID can use an exact login; contact-only AD records keep the placeholder', () => {
  const urlFor = phoneDirectoryAvatarUrls([
    { userId: 7, avatarVersion: 'v1', user: { directoryObjectId: null, login: 'sidorov' } },
    { userId: 8, avatarVersion: null, user: { directoryObjectId: 'with-no-photo', login: 'ivanov' } },
  ]);
  assert.equal(urlFor({ directoryObjectId: 'domain-guid', login: 'SIDOROV' }), '/api/contacts/avatars/7?v=v1');
  assert.equal(urlFor({ directoryObjectId: 'contact-guid', login: '' }), null);
  assert.equal(urlFor({ directoryObjectId: 'with-no-photo', login: 'ivanov' }), null);
});

test('the card renders an uploaded photo and falls back to the selected color icon', () => {
  const page = readFileSync(new URL('../app/pages/ad/browser.vue', import.meta.url), 'utf8');
  const endpoint = readFileSync(new URL('../server/api/contacts/avatars/[userId].get.ts', import.meta.url), 'utf8');
  assert.match(page, /Автодор-Платные дороги и другие общества группы компаний/);
  assert.match(page, /selected\.avatarUrl && failedAvatarUrl !== selected\.avatarUrl/);
  assert.match(page, /@error="failedAvatarUrl = selected\.avatarUrl"/);
  assert.match(page, /name="streamline-freehand-color:face-id-male-1"/);
  assert.match(endpoint, /getAccessActor\(event\)/);
  assert.match(endpoint, /private, no-store/);
  assert.match(endpoint, /authType: 'DOMAIN', status: 'ACTIVE', deletedAt: null/);
});
