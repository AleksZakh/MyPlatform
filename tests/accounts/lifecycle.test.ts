import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { PrismaClient } from '@prisma/client';

test('external lifecycle: permissions, stale revisions, revocation, anonymization and rollback',async()=>{
 const url=process.env.WORK_TEST_DATABASE_URL||'';if(!url||!new URL(url).pathname.endsWith('_work_test'))throw Error('Disposable test DB required');
 const db=new PrismaClient({datasources:{db:{url}}});const output=resolve('tests/accounts/.runtime.mjs');
 Object.assign(globalThis,{lifecycleDb:db,useRuntimeConfig:()=>({adminLogins:['sysadmin']}),lifecycleSession:null,sessionCleared:false,
  getUserSession:async()=>({user:(globalThis as any).lifecycleSession}),clearUserSession:async()=>{(globalThis as any).sessionCleared=true}});
 try{
  const built=await build({stdin:{contents:`export * from './server/services/user-lifecycle';export * from './server/utils/external-session';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',packages:'external',alias:{'~~':process.cwd()},plugins:[{name:'test',setup(b){
   b.onResolve({filter:/utils\/prisma$/},()=>({path:'db',namespace:'test'}));b.onResolve({filter:/access-control.service$/},()=>({path:'auth',namespace:'test'}));b.onResolve({filter:/user-realtime-revoke$/},()=>({path:'realtime',namespace:'test'}));
   b.onLoad({filter:/.*/,namespace:'test'},a=>({loader:'js',contents:a.path==='db'?'export const prisma=globalThis.lifecycleDb;':a.path==='realtime'?'export async function disconnectAccount(){return true;}':`export async function requirePermission(e,k,a){if(e.denied||k==='admin.users.lifecycle'&&!(e.grants||[]).includes(a))throw Object.assign(new Error('Denied'),{statusCode:403});return {userId:e.actor};}export async function getAccessActor(e,db){const user=await db.user.findUniqueOrThrow({where:{id:e.actor}});if(user.status!=='ACTIVE')throw Error('Inactive');return {user,isSystemAdmin:true};}`}));
  }}]});await writeFile(output,built.outputFiles[0]!.text);const api=await import(pathToFileURL(output).href);
  const admin=await db.user.create({data:{authType:'DOMAIN',status:'ACTIVE',login:'sysadmin'}});const event:any={actor:admin.id,grants:['UPDATE','DELETE'],context:{}};
  const request=await db.registrationRequest.create({data:{fullName:'Private Name',organization:'Private Org',position:'Tester',email:'external@example.test',status:'COMPLETED'}});
  const user=await db.user.create({data:{authType:'EXTERNAL',status:'ACTIVE',email:'external@example.test',fullName:'Private Name',passwordHash:'old-secret-hash',activationTokenHash:'old-activation',passwordResetTokenHash:'old-reset',registrationRequestId:request.id}});
  await db.userProfile.create({data:{userId:user.id,nickname:'Private nickname',avatar:Buffer.from([1,2,3]),avatarVersion:'old-avatar'}});
  const group=await db.spaceGroup.create({data:{name:'Test group'}});await db.spaceGroupUser.create({data:{groupId:group.id,userId:user.id}});
  const resource=await db.accessResource.findFirstOrThrow();await db.userPermission.create({data:{userId:user.id,resourceId:resource.id,action:'VIEW'}});
  const project=await db.workProject.create({data:{clientKey:randomUUID(),name:'Kept project',ownerId:user.id}});
  const task=await db.workTask.create({data:{clientKey:randomUUID(),title:'Kept task',creatorId:user.id,assigneeId:user.id}});
  const file=await db.workProjectFile.create({data:{id:randomUUID(),clientKey:randomUUID(),projectId:project.id,ownerId:user.id,scope:'PRIVATE',name:'kept.pdf',size:10,sha256:'0'.repeat(64),storageKey:randomUUID()}});
  await db.workProjectMember.create({data:{projectId:project.id,userId:user.id,role:'MEMBER'}});
  await db.workTaskParticipant.create({data:{taskId:task.id,userId:user.id}});
  const conversation=await db.chatConversation.create({data:{pairKey:`${admin.id}:${user.id}`,members:{create:[{userId:user.id},{userId:admin.id}]}}});
  await db.chatMessage.create({data:{conversationId:conversation.id,senderId:user.id,clientId:randomUUID(),body:'Keep this work message'}});
  const invite=await db.workProjectInvitation.create({data:{id:randomUUID(),projectId:project.id,userId:user.id,inviterId:admin.id,role:'MEMBER',expiresAt:new Date(Date.now()+100000)}});
  await assert.rejects(api.readLifecycle({...event,grants:[]},user.id),{statusCode:403});
  await assert.rejects(api.changeLifecycle({...event,grants:['UPDATE']},user.id,{action:'delete',reason:'testing',revision:user.updatedAt.toISOString()}),{statusCode:403});
  assert.throws(()=>api.parseLifecycle({action:'delete',revision:user.updatedAt.toISOString(),reason:'test',reviewed:true,confirmation:'wrong'}),{statusCode:400});
  const apply=async(action:string)=>{const state=await api.readLifecycle(event,user.id);return api.changeLifecycle(event,user.id,{action,reason:'test lifecycle',revision:state.user.revision});};
  const plan=await api.readLifecycle(event,user.id);assert.equal(plan.impact.projects.length,1);assert.equal(plan.impact.messages,1);assert.equal(plan.impact.privateFiles,1);assert.ok(!JSON.stringify(plan).includes('old-secret'));
  await apply('block');let current=await db.user.findUniqueOrThrow({where:{id:user.id}});assert.equal(current.status,'BLOCKED');assert.equal(current.externalSessionVersion,1);assert.equal(current.passwordResetTokenHash,null);
  assert.equal((await db.workProjectInvitation.findUniqueOrThrow({where:{id:invite.id}})).status,'CANCELLED');
  await assert.rejects(api.changeLifecycle(event,user.id,{action:'restore',reason:'stale',revision:user.updatedAt.toISOString()}),{statusCode:409});
  (globalThis as any).lifecycleSession={id:user.id,authType:'EXTERNAL',externalSessionVersion:0};await api.checkExternalSession({context:{}});assert.equal((globalThis as any).sessionCleared,true);
  await apply('restore');(globalThis as any).sessionCleared=false;await api.checkExternalSession({context:{}});assert.equal((globalThis as any).sessionCleared,true,'old cookie cannot revive after restore');
  (globalThis as any).lifecycleSession.externalSessionVersion=2;(globalThis as any).sessionCleared=false;await api.checkExternalSession({context:{}});assert.equal((globalThis as any).sessionCleared,false);
  await apply('disable');await apply('delete');current=await db.user.findUniqueOrThrow({where:{id:user.id}});assert.ok(current.deletedAt);assert.equal(current.fullName,'Удалённый аккаунт');assert.equal(current.passwordHash,null);assert.equal(current.email,null);assert.equal(current.status,'DISABLED');
  assert.equal(await db.userProfile.count({where:{userId:user.id}}),0);assert.equal(await db.userPermission.count({where:{userId:user.id}}),0);assert.equal(await db.spaceGroupUser.count({where:{userId:user.id}}),0);
  assert.equal((await db.registrationRequest.findUniqueOrThrow({where:{id:request.id}})).email,'');
  assert.equal((await db.chatMessage.findFirstOrThrow({where:{senderId:user.id},include:{sender:true}})).sender.fullName,'Удалённый аккаунт');assert.equal((await db.workTask.findUniqueOrThrow({where:{id:task.id}})).creatorId,user.id);
  assert.equal((await db.workProjectFile.findUniqueOrThrow({where:{id:file.id}})).scope,'PRIVATE');assert.equal(await db.workProjectMember.count({where:{userId:user.id}}),0);assert.equal(await db.workTaskParticipant.count({where:{userId:user.id}}),0);
  await assert.rejects(apply('restore'),{statusCode:409});await assert.rejects(db.user.update({where:{id:user.id},data:{status:'ACTIVE'}}));await db.$disconnect();
  const replacement=await db.user.create({data:{authType:'EXTERNAL',email:'external@example.test',status:'ACTIVE',passwordHash:'replacement'}});assert.notEqual(replacement.id,user.id);assert.equal(await db.userPermission.count({where:{userId:replacement.id}}),0);
  await db.$executeRawUnsafe(`CREATE FUNCTION reject_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.note = 'force rollback' THEN RAISE EXCEPTION 'test rollback'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER test_reject_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_test_audit()`);
  await assert.rejects(api.changeLifecycle(event,replacement.id,{action:'delete',reason:'force rollback',revision:replacement.updatedAt.toISOString()}));await db.$disconnect();assert.equal((await db.user.findUniqueOrThrow({where:{id:replacement.id}})).deletedAt,null);
 }finally{await db.$disconnect();await unlink(output).catch(()=>{});}
});
