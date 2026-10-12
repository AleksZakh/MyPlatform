import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const callbacks=[];const added=[];
const preferences={value:{notifications:{chatPopup:true,chatSound:false}}};
Object.assign(globalThis,{useUserPreferences:()=>({preferences}),useToast:()=>({add:o=>added.push(o)}),onMounted:f=>callbacks.push(f),onUnmounted:()=>{},document:{hidden:false,hasFocus:()=>true}});
const buildResult=await build({entryPoints:['app/composables/useChatNotification.ts'],bundle:true,write:false,format:'esm'});
const {useChatNotification}=await import('data:text/javascript;base64,'+Buffer.from(buildResult.outputFiles[0].text).toString('base64'));
const dialog=(id,senderId=2)=>({id:10,unread:1,last:{id,senderId}});
test('chat notifications ignore backlog, duplicates, own messages and visible current dialog',()=>{
 const n=useChatNotification();n.observe([dialog(1)],1);assert.equal(added.length,0);
 n.observe([dialog(2)],1);assert.equal(added.length,1);
 n.observe([dialog(2)],1);n.observe([dialog(3,1)],1);n.observe([dialog(4)],1,10);assert.equal(added.length,1);
 preferences.value.notifications.chatPopup=false;n.observe([dialog(5)],1);assert.equal(added.length,1);
 n.reset();preferences.value.notifications.chatPopup=true;n.observe([dialog(20)],1);assert.equal(added.length,1);
});
