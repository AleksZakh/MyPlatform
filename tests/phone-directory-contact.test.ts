import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isADContact, normalizePhoneContact } from '../server/utils/phone-directory-contact';

test('AD contact without sAMAccountName becomes a directory card', () => {
  const contact = normalizePhoneContact({
    objectClass: ['top', 'person', 'organizationalPerson', 'contact'],
    displayName: 'Иванова Мария Петровна',
    mail: 'Maria.Ivanova@Example.ru',
    department: 'Учебный центр, отдел образовательных программ',
    title: 'Методист',
    telephoneNumber: '1234',
  }, '11111111-2222-3333-4444-555555555555');
  assert.ok(contact);
  assert.equal(contact.fullName, 'Иванова Мария Петровна');
  assert.equal(contact.login, '');
  assert.equal(contact.directoryObjectId, '11111111-2222-3333-4444-555555555555');
  assert.equal(contact.email, 'maria.ivanova@example.ru');
  assert.equal(contact.department, 'Учебный центр, отдел образовательных программ');
  assert.equal(contact.telephoneNumber, '1234');
  assert.equal(contact.position, 'Методист');
  assert.equal(contact.accountDisabled, false);
});

test('contact name fallback, nulls and multi-valued LDAP attributes', () => {
  const contact = normalizePhoneContact({ cn: 'Справочный контакт', mail: [' ', 'INFO@EXAMPLE.RU'] }, 'guid');
  assert.ok(contact);
  assert.equal(contact.fullName, 'Справочный контакт');
  assert.equal(contact.email, 'info@example.ru');
  assert.equal(contact.telephoneNumber, null);
  assert.equal(normalizePhoneContact({ }, 'guid'), null);
});

test('contact objectClass identification is case insensitive', () => {
  assert.equal(isADContact({ objectClass: ['top', 'person', 'contact'] }), true);
  assert.equal(isADContact({ objectClass: ['CONTACT'] }), true);
  assert.equal(isADContact({ objectClass: ['top', 'person', 'user'] }), false);
});

test('LDAP scope requests both user and contact, reads other results, and invalidates old empty cache', () => {
  const source = readFileSync(new URL('../server/services/phone-directory-scopes.service.ts', import.meta.url), 'utf8');
  assert.match(source, /objectClass=user\)\(objectClass=contact/);
  assert.match(source, /results\?\.other/);
  assert.match(source, /phonebook:ad:contacts-v2/);
  assert.match(source, /normalizePhoneContact/);
});
