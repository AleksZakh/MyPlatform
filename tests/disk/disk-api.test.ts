import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createApp, createRouter, toNodeListener } from 'h3';

test('Disk API is admin-only, fixed-command, no-store and throttled; report validation and counters', async () => {
  const generated: string[] = [], calls: any[] = [];
  const report = { version: 1, status: 'complete', checkedAt: new Date().toISOString(), durationMs: 50, candidateBytes: 4096,
    policy: { keepLatest: 3, logDays: 30 }, warnings: [], items: [{ path: '/var/www/space/releases/test', category: 'release', status: 'candidate', bytes: 4096, reclaimable: 4096, reason: 'old', modifiedAt: null }] };
  (globalThis as any).__diskTest = { calls, report, audits: [] };
  async function bundle(file: string) {
    const result = await build({ entryPoints: [file], bundle: true, write: false, format: 'esm', platform: 'node', packages: 'external', plugins: [{ name: 'disk-test-boundaries', setup(b) {
      b.onResolve({ filter: /access-control\.service$/ }, () => ({ path: 'auth', namespace: 'test' }));
      b.onResolve({ filter: /utils\/auditLog$/ }, () => ({ path: 'audit', namespace: 'test' }));
      b.onResolve({ filter: /^node:child_process$/ }, () => ({ path: 'exec', namespace: 'test' }));
      b.onLoad({ filter: /.*/, namespace: 'test' }, ({ path }) => ({ loader: 'js', contents: path === 'auth' ? `
        export async function getAccessActor(e){const id=Number(e.node.req.headers['x-test-user']);if(!id)throw Object.assign(new Error('auth'),{statusCode:401});return {user:{id,status:'ACTIVE'},isSystemAdmin:id===2};}
      ` : path === 'audit' ? `export async function writeAuditEvent(e){globalThis.__diskTest.audits.push(e.action);}` : `
        export function execFile(file,args,options,callback){globalThis.__diskTest.calls.push({file,args,options});setTimeout(()=>callback(null,JSON.stringify(globalThis.__diskTest.report)),10);}
      ` }));
    } }] });
    const filename = resolve('tests/disk/.test-' + generated.length + '.mjs');generated.push(filename);
    await writeFile(filename, result.outputFiles[0]!.text);return import(pathToFileURL(filename).href);
  }
  const app = createApp({ debug: false }), router = createRouter(), server = createServer(toNodeListener(app));
  try {
    router.get('/disk', (await bundle('server/api/admin/files/disk/index.get.ts')).default);
    router.post('/scan', (await bundle('server/api/admin/files/disk/scan.post.ts')).default);
    app.use(router);server.listen(0,'127.0.0.1');await once(server,'listening');
    const base = 'http://127.0.0.1:'+(server.address() as any).port;
    const request = (path:string,user:number,header=false) => fetch(base+path,{method:path==='/scan'?'POST':'GET',headers:{'x-test-user':String(user),...(header?{'x-space-disk-scan':'1'}:{})}});
    assert.equal((await request('/disk',0)).status,401);
    assert.equal((await request('/disk',1)).status,403);
    assert.equal((await request('/scan',1,true)).status,403);
    assert.equal((await request('/scan',2)).status,403);assert.equal(calls.length,0);
    const summary=await request('/disk',2);assert.equal(summary.status,200);assert.match(summary.headers.get('cache-control')!,/no-store/);
    assert.ok((await summary.json()).volumes.length>0);
    const scan=await request('/scan',2,true);assert.equal(scan.status,200);assert.equal((await scan.json()).candidateBytes,4096);
    assert.equal(calls.length,1);assert.equal(calls[0].file,'/usr/bin/sudo');
    assert.deepEqual(calls[0].args,['-n','--','/usr/local/sbin/space-disk-report']);assert.equal(calls[0].options.shell,undefined);
    assert.equal((await request('/scan',2,true)).status,429);assert.equal(calls.length,1);
    const service=await bundle('server/services/storage/disk.ts');
    assert.deepEqual(service.volumeNumbers({blocks:100n,bsize:1024n,bfree:20n,bavail:15n,files:1000n,ffree:400n}),
      {total:102400,used:81920,available:15360,reserved:5120,usedPercent:84.2,inodes:1000,freeInodes:400});
    assert.throws(()=>service.parseDiskReport('{bad'));
    assert.throws(()=>service.parseDiskReport(JSON.stringify({...report,candidateBytes:1})));
  } finally {
    server.closeAllConnections();server.close();
    await Promise.all(generated.map(file=>rm(file,{force:true})));
    delete (globalThis as any).__diskTest;
  }
});
