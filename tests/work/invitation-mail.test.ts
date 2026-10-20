import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';

test('active project notification has an invitations link; activation guidance only for pending domain users', async () => {
 const messages: any[] = []; let closes=0, reject=false;
 Object.assign(globalThis, {
  useRuntimeConfig: () => ({ siteUrl: 'https://space.example.test', smtp: { host: 'smtp.example.test', from: 'space@example.test', secure: false } }),
  notificationTransport: () => ({ sendMail: async (mail: unknown) => { messages.push(mail); return { accepted: reject?[]:['test@example.test'], messageId:'<test@example.test>' }; }, close: () => { closes++; } }),
 });
 const bundle = await build({ entryPoints: ['server/utils/chat-invitation-mail.ts'], bundle: true, write: false, platform:'node', format:'esm', packages:'external', plugins:[{name:'smtp-stub',setup(b){
  b.onResolve({filter:/^nodemailer$/},()=>({path:'smtp',namespace:'stub'}));
  b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export default {createTransport:()=>globalThis.notificationTransport()};'}));
 }}] });
 const output = new URL('./.mail-template-test.mjs', import.meta.url);
 try {
  await writeFile(output,bundle.outputFiles[0]!.text);const mail=await import(output.href);
  assert.equal((await mail.sendProjectNotificationEmail('test@example.test','Автор',{id:1,name:'Проект'})).messageId,'<test@example.test>');
  assert.match(messages[0].text,/https:\/\/space\.example\.test\/projects\?invitations=1/);
  assert.doesNotMatch(messages[0].text,/активирована|проверки AD/);
  await mail.sendChatInvitationEmail('test@example.test','Автор',{id:1,name:'Проект'});
  assert.match(messages[1].text,/проверки AD/);assert.match(messages[1].text,/login\?redirect=/);
  reject=true;await assert.rejects(mail.sendProjectNotificationEmail('test@example.test','Автор',{id:1,name:'Проект'}),{code:'RECIPIENT_REJECTED'});
  assert.equal(closes,3);
 } finally { await unlink(output).catch(()=>{}); }
});
