import test from 'node:test';
import assert from 'node:assert/strict';
import { invitationTarget } from '../../server/services/chat/invitation-input';
test('directory identifiers are opaque; invalid request shapes are rejected', () => {
 const directoryLogin = 'test_employee';
 for (const directoryObjectId of ['s-71-29333743916866-72048014-29952050', '11111111-1111-4111-8111-111111111111', 'b64:YWJjZA=='])
  assert.equal(invitationTarget.safeParse({directoryLogin, directoryObjectId}).success, true);
 assert.equal(invitationTarget.safeParse({directoryLogin}).success, true);
 assert.equal(invitationTarget.safeParse({userId: 12}).success, true);
 for (const input of [{userId:0}, {directoryLogin:''}, {directoryLogin,directoryObjectId:''}, {directoryLogin,directoryObjectId:'x'.repeat(256)}, {directoryLogin,directoryObjectId:'a b'}, {directoryLogin,directoryObjectId:'a\u0000b'}, {userId:12,directoryLogin}, {directoryLogin,email:'other@example.test'}])
  assert.equal(invitationTarget.safeParse(input).success, false);
});
