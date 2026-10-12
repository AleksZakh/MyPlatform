import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { ref,watch,nextTick } from 'vue';
Object.assign(globalThis,{ref,watch});
const built=await build({entryPoints:['app/composables/useChatMessageActions.ts'],bundle:true,write:false,format:'esm'});
const { useChatMessageActions }=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
test('edit preserves draft on failure; delete requires separate explicit submission; own/archived guard',async()=>{
 const row=ref({id:10,conversationId:3,body:'Original',revision:4});const allowed=ref(true);let requests=[],fail=true;
 globalThis.$fetch=async(path,options)=>{requests.push(options.body);if(fail)throw {data:{message:'Conflict'}};return {...row.value,body:options.body.action==='delete'?'':options.body.body,revision:5,deletedAt:options.body.action==='delete'?'now':null};};
 const actions=useChatMessageActions(()=>row.value,()=>allowed.value,value=>row.value=value);
 actions.edit();actions.text.value='Edited';await actions.submit('edit');
 assert.equal(actions.editing.value,true);assert.equal(actions.text.value,'Edited');assert.equal(actions.error.value,'Conflict');assert.equal(row.value.body,'Original');
 fail=false;await actions.submit('edit');assert.equal(row.value.body,'Edited');assert.equal(actions.editing.value,false);assert.equal(requests[0].revision,requests[1].revision);
 actions.remove();assert.equal(requests.length,2);assert.equal(actions.deleting.value,true);
 allowed.value=false;await actions.submit('delete');assert.equal(requests.length,2);
 allowed.value=true;await actions.submit('delete');await nextTick();assert.ok(row.value.deletedAt);assert.equal(row.value.body,'');assert.equal(actions.deleting.value,false);
});
