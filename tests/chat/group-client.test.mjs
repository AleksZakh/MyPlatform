import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { JSDOM } = await import(process.env.CHAT_JSDOM_PATH || 'jsdom');
const dom = new JSDOM('<div id="app"></div>', { url: 'https://space.test' });
for (const key of ['window','document','Element','SVGElement','HTMLElement']) globalThis[key] = dom.window[key];
const vue = await import('vue');
for (const key of ['ref','computed','watch','onBeforeUnmount']) globalThis[key] = vue[key];
globalThis.useUserSession = () => ({user:vue.ref({id:1})});
const built = await build({entryPoints:['app/composables/useChatGroupEditor.ts'],bundle:true,write:false,format:'esm'});
const { useChatGroupEditor } = await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const creates=[], patches=[], changes=[];
let fail=true;
globalThis.$fetch = async (path,options={}) => {
 if (path === '/api/chat/contacts') return {people:[{id:2,status:'ACTIVE',fullName:'Active'},{id:0,status:'PENDING_ACTIVATION',directoryLogin:'not-yet'}],hasMore:false};
 if (path === '/api/chat/groups' && options.method === 'POST') { creates.push({...options.body}); if(fail) throw new Error('Network'); return {id:10}; }
 if (options.method === 'PATCH') { patches.push(options.body);return {ok:true}; }
 return {id:10,name:'Work',archived:false,myRole:'OWNER',members:[{id:1,role:'OWNER',status:'ACTIVE'}]};
};
test('group editor: active-only candidates, explicit mutations, idempotent create retry',async()=>{
 let editor; const id=vue.ref(undefined);
 const app=vue.createApp({setup(){editor=useChatGroupEditor(()=>id.value,v=>changes.push(v));return()=>vue.h('div');}});app.mount('#app');
 try {
  editor.open.value=true;await vue.nextTick();await new Promise(r=>setTimeout(r,0));
  assert.deepEqual(editor.candidates.value.map(p=>p.id),[2]);
  editor.name.value='Work';editor.toggle(2);
  await editor.create();assert.ok(editor.attempt.value);assert.equal(changes.length,0);
  fail=false;await editor.create();assert.equal(creates[0].clientId,creates[1].clientId);assert.deepEqual(changes,[10]);assert.equal(editor.open.value,false);
  id.value=10;await vue.nextTick();editor.open.value=true;await vue.nextTick();await new Promise(r=>setTimeout(r,0));
  assert.equal(editor.owner.value,true);
  editor.confirm('Archive?',{action:'archive',archived:true});assert.equal(patches.length,0);
  await editor.change(editor.confirmation.value.body);assert.equal(patches.length,1);assert.equal(editor.confirmation.value,null);
 } finally {app.unmount();dom.window.close();}
});
