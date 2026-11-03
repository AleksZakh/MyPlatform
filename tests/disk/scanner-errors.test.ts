import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { writeFile,rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
test('Scanner installation failures are classified and failure cooldown is ten seconds',async()=>{
 const state:any={ready:false,calls:0,stderr:''};(globalThis as any).__scannerTest=state;
 const file=resolve('tests/disk/.scanner-errors.mjs');const originalNow=Date.now;let now=Date.now();Date.now=()=>now;
 try{const r=await build({entryPoints:['server/services/storage/disk.ts'],bundle:true,write:false,format:'esm',platform:'node',packages:'external',plugins:[{name:'fixture',setup(b){
 b.onResolve({filter:/access-control\.service$/},()=>({path:'auth',namespace:'fixture'}));b.onResolve({filter:/^\.\/scanner$/},()=>({path:'scanner',namespace:'fixture'}));b.onResolve({filter:/^node:child_process$/},()=>({path:'exec',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({loader:'js',contents:path==='auth'?'export async function getAccessActor(){};':path==='scanner'?`export const scannerCommand='/usr/local/sbin/space-disk-report';export async function scannerStatus(){return {ready:globalThis.__scannerTest.ready,code:'SCANNER_MISSING',message:'Missing scanner'};}`:`export function execFile(f,a,o,cb){globalThis.__scannerTest.calls++;cb(Object.assign(Error('fail'),{code:1}),'',globalThis.__scannerTest.stderr);}`}));
 }}]});await writeFile(file,r.outputFiles[0]!.text);const s=await import(pathToFileURL(file).href);
 await assert.rejects(s.scanDisk(),(e:any)=>e.statusCode===503&&e.data.code==='SCANNER_MISSING');assert.equal(state.calls,0);
 await assert.rejects(s.scanDisk(),(e:any)=>e.statusCode===429&&e.data.retryAfter===10);
 now+=11000;state.ready=true;state.stderr='sudo: a password is required';
 await assert.rejects(s.scanDisk(),(e:any)=>e.statusCode===503&&e.data.code==='SCANNER_SUDO_DENIED');assert.equal(state.calls,1);
 now+=11000;state.stderr='Traceback: internal paths';
 await assert.rejects(s.scanDisk(),(e:any)=>e.statusCode===503&&e.data.code==='SCANNER_FAILED'&&!e.message.includes('Traceback'));
 }finally{Date.now=originalNow;await rm(file,{force:true});delete (globalThis as any).__scannerTest;}
});
