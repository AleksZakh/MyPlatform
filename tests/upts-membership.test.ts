import test from 'node:test';
import assert from 'node:assert/strict';
import { isUptsDepartment, isUptsGroup } from '../shared/utils/upts-membership';
import { pageAccess } from '../shared/utils/page-access';
test('UPTS membership uses active saved department, never partial names', () => {
  assert.equal(isUptsDepartment(null),false);
  assert.equal(isUptsDepartment({key:'upts',name:'УПТС',isActive:false}),false);
  assert.equal(isUptsDepartment({key:'other',name:'Служба поддержки УПТС',isActive:true}),false);
  assert.equal(isUptsDepartment({key:'upts',name:'Новое название',isActive:true}),true);
  assert.equal(isUptsDepartment({key:'imported-ad-12',name:' Управление  подготовки территории строительства ',isActive:true}),true);
});
test('UPTS group uses exact normalized names and active flag', () => {
  for (const name of ['УПТС', ' upts ', ' Управление  подготовки территории строительства ']) assert.equal(isUptsGroup({ name, isActive: true }), true);
  for (const name of ['Поддержка УПТС', 'УПТС-архив', 'Other']) assert.equal(isUptsGroup({ name, isActive: true }), false);
  assert.equal(isUptsGroup({ name: 'УПТС', isActive: false }), false);
});
test('Resource routes include query navigation and trailing slashes', () => {
  assert.deepEqual(pageAccess('/departments/upts/'),{upts:true});
  assert.deepEqual(pageAccess('/departments/upts/projects'),{upts:true});
  assert.deepEqual(pageAccess('/departments/diagnostic',{module:'structures'}),{resources:['diagnostic.structures']});
  assert.deepEqual(pageAccess('/departments/diagnostic',{module:'works'}),{resources:['diagnostic.works']});
  assert.deepEqual(pageAccess('/departments/diagnostic'),{resources:['diagnostic.contracts']});
  assert.equal(pageAccess('/access-denied'),null);
  assert.equal(pageAccess('/projects'),null);
});
