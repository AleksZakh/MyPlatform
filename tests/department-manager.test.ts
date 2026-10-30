import assert from 'node:assert/strict';
import { resolveDepartmentManager } from '../server/utils/department-manager';

const configured = 'Евгений Миронычев';
const user = (fullName: string, accountDisabled = false) => ({ fullName, accountDisabled });
assert.equal(resolveDepartmentManager([], configured).name, configured);
assert.equal(resolveDepartmentManager([user('Миронычев Евгений Иванович')], configured).name, 'Миронычев Евгений Иванович');
assert.equal(resolveDepartmentManager([user('  ЕВГЕНИЙ  МИРОНЫЧЁВ  ')], configured).name, 'ЕВГЕНИЙ МИРОНЫЧЁВ');
assert.equal(resolveDepartmentManager([user('Миронычева Евгения')], configured).name, configured);
assert.equal(resolveDepartmentManager([user('Миронычев Евгений Иванович', true)], configured).name, configured);
assert.equal(resolveDepartmentManager([user('Миронычев Евгений Иванович'), user('Миронычев Евгений Петрович')], configured).name, configured);
assert.deepEqual(resolveDepartmentManager([user('Миронычев Евгений Иванович')], configured), { name: 'Миронычев Евгений Иванович', avatar: '' });
console.log('Department manager: cache lookup, fallback, disabled users and namesakes passed.');
