import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newScope,newDraft,setTemplate,effectiveRights,cloneAssignment,parseDraft,emptyRights} from '../../shared/access/department-role-draft';
test('defaults separate department admin from reader and editor; absent assignment grants nothing',()=>{
 const s=newScope();assert.deepEqual(effectiveRights(s),emptyRights());
 assert.deepEqual(effectiveRights(s,{role:'observer',overrides:{}}),{...emptyRights(),view:true});
 assert.equal(s.templates.editor.delete,false);assert.equal(s.templates.moderator.restore,true);assert.equal(s.templates.moderator.manage,false);assert.equal(s.templates.admin.manage,true);
});
test('personal deny dominates template; denied view closes every capability, even personal allow',()=>{
 const s=newScope();assert.equal(effectiveRights(s,{role:'admin',overrides:{delete:false}}).delete,false);
 assert.deepEqual(effectiveRights(s,{role:'admin',overrides:{view:false,create:true}}),emptyRights());
 assert.equal(effectiveRights(s,{role:'observer',overrides:{update:true}}).update,true);
});
test('templates apply to assigned users and are isolated across departments; exceptions remain',()=>{
 const a=newScope(),b=newScope();const person={role:'observer' as const,overrides:{delete:false}};
 setTemplate(a,'observer','delete',true);assert.equal(a.templates.observer.view,true);assert.equal(effectiveRights(a,person).delete,false);assert.equal(b.templates.observer.delete,false);
 setTemplate(a,'admin','view',false);assert.deepEqual(a.templates.admin,emptyRights());
});
test('copy does not share overrides and drafts round-trip',()=>{
 const a={role:'editor' as const,overrides:{delete:true}};const b=cloneAssignment(a);b.overrides.delete=false;assert.equal(a.overrides.delete,true);
 const d=newDraft();d.scopes.lab=newScope();d.scopes.lab.assignments['7']=a;assert.deepEqual(parseDraft(JSON.stringify(d)),d);
});
test('invalid local data rejected including hidden global scope and arbitrary capabilities',()=>{
 assert.throws(()=>parseDraft('{'));assert.throws(()=>parseDraft('{"version":2,"scopes":{}}'));
 const d=newDraft();d.scopes.admin=newScope();assert.throws(()=>parseDraft(JSON.stringify(d)));
 delete d.scopes.admin;d.scopes.lab=newScope();d.scopes.lab.assignments['7']={role:'admin',overrides:{}};
 const data=JSON.parse(JSON.stringify(d));data.scopes.lab.assignments['7'].overrides.globalAdmin=true;assert.throws(()=>parseDraft(JSON.stringify(data)));
});
