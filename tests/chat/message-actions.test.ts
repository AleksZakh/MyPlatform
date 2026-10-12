import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const url=process.env.CHAT_TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_chat_test')) throw new Error('Use a disposable *_chat_test database');
process.env.DATABASE_URL=url;
const { prisma }=await import('../../server/utils/prisma');
const { openDialog,saveMessage }=await import('../../server/services/chat/repository');
const { changeMessage,messageChanges,messageChangeInput }=await import('../../server/services/chat/message-actions');
const { createGroup,changeGroup }=await import('../../server/services/chat/groups');
const failure=(status:number)=>(e:any)=>e.statusCode===status;
test('own messages only, unlimited age, immutable history, conflicts, retries, deletion and change cursors',async()=>{
 try {
  for(const file of [process.env.BASE_SCHEMA_SQL!,'prisma/migrations/20261012150000_chat_groups/migration.sql','prisma/migrations/20261012195000_chat_message_actions/migration.sql']) {
   for(const sql of (await readFile(file,'utf8')).split(';').filter(s=>s.trim())) await prisma.$executeRawUnsafe(sql);
  }
  for(let id=1;id<=4;id++) await prisma.user.create({data:{id,authType:'DOMAIN',login:`mutation-${id}`,status:'ACTIVE'}});
  const direct=await openDialog(1,2), other=await openDialog(1,3);
  const row=await saveMessage(1,direct.id,'Original',randomUUID());
  await prisma.chatMessage.update({where:{id:row.id},data:{createdAt:new Date('2020-01-01')}});
  await assert.rejects(changeMessage(2,direct.id,row.id,{action:'edit',body:'Intrusion',revision:0}),failure(403));
  await assert.rejects(changeMessage(3,direct.id,row.id,{action:'delete',revision:0}),failure(404));
  await assert.rejects(changeMessage(1,other.id,row.id,{action:'delete',revision:0}),failure(404));
  const edited=await changeMessage(1,direct.id,row.id,{action:'edit',body:'Edited',revision:0});
  assert.equal(edited.body,'Edited');assert.ok(edited.editedAt);assert.equal(edited.createdAt.getUTCFullYear(),2020);
  assert.equal((await changeMessage(1,direct.id,row.id,{action:'edit',body:'Edited',revision:0})).revision,edited.revision);
  assert.equal(await prisma.chatMessageRevision.count(),1);
  await assert.rejects(changeMessage(1,direct.id,row.id,{action:'edit',body:'Conflict',revision:0}),failure(409));
  const deleted=await changeMessage(1,direct.id,row.id,{action:'delete',revision:edited.revision});
  assert.equal(deleted.body,'');assert.ok(deleted.deletedAt);
  assert.equal((await changeMessage(1,direct.id,row.id,{action:'delete',revision:edited.revision})).revision,deleted.revision);
  await assert.rejects(changeMessage(1,direct.id,row.id,{action:'edit',body:'Restore',revision:deleted.revision}),failure(409));
  const history=await prisma.chatMessageRevision.findMany({orderBy:{id:'asc'}});
  assert.deepEqual(history.map(h=>[h.action,h.previousBody]),[['EDIT','Original'],['DELETE','Edited']]);
  const changes=await messageChanges(2,direct.id,edited.revision);
  assert.equal(changes.messages[0]?.id,row.id);assert.equal(changes.messages[0]?.body,'');
  assert.equal('revisions' in changes.messages[0]!,false);
  assert.deepEqual((await messageChanges(3,direct.id,0)).messages,[]);
  const group=await createGroup(1,'Group',[2,3],randomUUID());
  const peerRow=await saveMessage(2,group.id,'Member original',randomUUID());
  await assert.rejects(changeMessage(1,group.id,peerRow.id,{action:'delete',revision:0}),failure(403));
  await changeGroup(1,group.id,{action:'archive',archived:true});
  await assert.rejects(changeMessage(2,group.id,peerRow.id,{action:'delete',revision:0}),failure(409));
  await changeGroup(1,group.id,{action:'archive',archived:false});
  await changeGroup(1,group.id,{action:'remove',userId:2});
  await assert.rejects(changeMessage(2,group.id,peerRow.id,{action:'delete',revision:0}),failure(404));
  await prisma.user.update({where:{id:1},data:{status:'BLOCKED'}});
  await assert.rejects(changeMessage(1,direct.id,row.id,{action:'delete',revision:deleted.revision}),failure(403));
  assert.equal(messageChangeInput.safeParse({action:'edit',body:'   ',revision:0}).success,false);
  assert.equal(messageChangeInput.safeParse({action:'edit',body:'x'.repeat(4001),revision:0}).success,false);
  await prisma.user.update({where:{id:1},data:{status:'ACTIVE'}});
  // Concurrent changes against the same revision cannot both overwrite the row.
  const concurrent=await saveMessage(3,other.id,'Concurrent',randomUUID());
  const attempts=await Promise.allSettled(['A','B'].map(body=>changeMessage(3,other.id,concurrent.id,{action:'edit',body,revision:0})));
  assert.equal(attempts.filter(a=>a.status==='fulfilled').length,1);
  const cursor=(await prisma.chatConversation.findUniqueOrThrow({where:{id:direct.id}})).messageVersion;
  await prisma.chatMessage.createMany({data:Array.from({length:51},()=>({conversationId:direct.id,senderId:2,body:'Page',clientId:randomUUID()}))});
  const batch=await prisma.chatMessage.findMany({where:{conversationId:direct.id,senderId:2}});
  for(const m of batch) await changeMessage(2,direct.id,m.id,{action:'edit',body:'Changed',revision:0});
  const page1=await messageChanges(1,direct.id,cursor),page2=await messageChanges(1,direct.id,page1.cursor);
  assert.equal(page1.messages.length,50);assert.equal(page1.hasMore,true);assert.equal(page2.messages.length,1);assert.equal(page2.hasMore,false);
  assert.ok(page2.cursor>page1.cursor);
 } finally {await prisma.$disconnect();}
});
