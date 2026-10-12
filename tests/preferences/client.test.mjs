import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { ref, computed, watch, nextTick } from 'vue';
const states = new Map();
Object.assign(globalThis, { ref, computed, watch,
 useState: (key, init) => { if (!states.has(key)) states.set(key, ref(init())); return states.get(key); },
});
const session = { user: ref({id:1}), loggedIn: ref(true) };
globalThis.useUserSession = () => session;
const bundle = await build({ entryPoints:['app/composables/useUserPreferences.ts'],bundle:true,write:false,format:'esm',define:{'import.meta.client':'false'},alias:{'~~':process.cwd()} });
const { useUserPreferences } = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
let release;
globalThis.$fetch = () => new Promise(resolve => { release = resolve; });
test('late profile response cannot leak preferences across accounts; failed saves preserve applied state', async()=>{
 const p = useUserPreferences();
 const old = p.load(); const first = release; session.user.value={id:2};
 const current = p.load(); const second = release;
 first({display:{contrast:'high'},notifications:{},labTable:null}); await old;
 assert.equal(p.ready.value,false);
 second({display:{contrast:'normal'},notifications:{},labTable:null}); await current;
 assert.equal(p.ready.value,true);
 globalThis.$fetch=async()=>{throw new Error('offline');};
 await assert.rejects(p.save({display:{...p.preferences.value.display,contrast:'high'}}));
 assert.equal(p.preferences.value.display.contrast,'normal');
 assert.ok(p.error.value);
 let late;
 globalThis.$fetch=()=>new Promise(resolve=>{late=resolve;});
 const pending=p.load();session.loggedIn.value=false;await p.load();
 late({display:{contrast:'high'},notifications:{},labTable:null});await pending;
 assert.equal(p.ready.value,false);assert.equal(p.preferences.value.display.contrast,'normal');
});
