import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, rm, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { build } from 'esbuild';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import * as h3 from 'h3';
import { taskSummary, filterUpts } from '../../shared/utils/upts';

const url = process.env.WORK_TEST_DATABASE_URL || '';
if (!url || !new URL(url).pathname.endsWith('_work_test'))
  throw new Error('Use a disposable *_work_test database');
const storage = process.env.WORK_PROJECT_FILES_ROOT || '';
if (!storage.includes('space-project-files-test-'))
  throw new Error('Use disposable space-project-files-test- storage');
const db = new PrismaClient({ datasources: { db: { url } } });
Object.assign(globalThis, h3, { workTestDb: db });
const generated: string[] = [];
async function handler(file: string) {
  const out = await build({
    entryPoints: [file],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    plugins: [
      {
        name: 'upts-test-context',
        setup(b) {
          b.onResolve({ filter: /domain-group-directory.service$/ }, () => ({
            path: 'groups',
            namespace: 'test',
          }));
          b.onResolve({ filter: /access-control.service$/ }, () => ({
            path: 'auth',
            namespace: 'test',
          }));
          b.onResolve({ filter: /(?:utils\/prisma|^\.\/prisma)$/ }, () => ({
            path: 'db',
            namespace: 'test',
          }));
          b.onLoad({ filter: /.*/, namespace: 'test' }, (args) => ({
            loader: 'js',
            contents:
              args.path === 'db'
                ? 'export const prisma=globalThis.workTestDb;'
                : args.path === 'groups'
                  ? 'export async function resolveDomainGroupIds(){return [];}'
                  : `
 export async function getAccessActor(e){const id=Number(e.node.req.headers['x-test-user']);if(!id)throw Object.assign(new Error('auth'),{statusCode:401});const user=await globalThis.workTestDb.user.findUnique({where:{id},include:{department:true}});if(!user||user.status!=='ACTIVE')throw Object.assign(new Error('inactive'),{statusCode:403});return {user,isSystemAdmin:false};}
 export async function requirePermission(e){const a=await getAccessActor(e);if(a.user.id!==2)throw Object.assign(new Error('denied'),{statusCode:403});return {userId:a.user.id};}
 `,
          }));
        },
      },
    ],
  });
  const filename = resolve(
    'tests/work/.upts-test-' + generated.length + '.mjs',
  );
  generated.push(filename);
  await writeFile(filename, out.outputFiles[0]!.text);
  return (await import(pathToFileURL(filename).href)).default;
}
test('UPTS: shared work model, access, object reuse, templates, folders, Excel and archive', async () => {
  const app = h3.createApp({ debug: false }),
    router = h3.createRouter(),
    server = createServer(h3.toNodeListener(app));
  try {
    await db.user.createMany({
      data: [
        { id: 2, login: 'owner' },
        { id: 3, login: 'member' },
        { id: 4, login: 'outsider' },
        { id: 5, login: 'observer' },
      ].map((u) => ({ ...u, status: 'ACTIVE', authType: 'EXTERNAL' })),
    });
    const routes = [
      ['/upts', 'upts/index.get', 'get'],
      ['/upts/demo', 'upts/demo.post', 'post'],
      ['/upts/objects', 'upts/objects.get', 'get'],
      ['/upts/export', 'upts/export.get', 'get'],
      ['/upts/projects/:id/objects', 'upts/projects/[id]/objects.get', 'get'],
      ['/upts/projects/:id/objects', 'upts/projects/[id]/objects.post', 'post'],
      [
        '/upts/projects/:id/objects/:objectId',
        'upts/projects/[id]/objects/[objectId].put',
        'put',
      ],
      [
        '/upts/projects/:id/contracts',
        'upts/projects/[id]/contracts.post',
        'post',
      ],
      [
        '/upts/projects/:id/template',
        'upts/projects/[id]/template.post',
        'post',
      ],
      ['/projects', 'work/projects/index.post', 'post'],
      ['/projects/:id', 'work/projects/[id].put', 'put'],
      ['/projects/:id/archive', 'work/projects/[id]/archive.post', 'post'],
      ['/tasks', 'work/tasks/index.post', 'post'],
      ['/tasks/:id', 'work/tasks/[id].put', 'put'],
      ['/projects/:id/files', 'work/projects/[id]/files/index.get', 'get'],
      ['/projects/:id/files', 'work/projects/[id]/files/index.post', 'post'],
      [
        '/projects/:id/files/:fileId',
        'work/projects/[id]/files/[fileId].get',
        'get',
      ],
    ];
    for (const [path, file, method] of routes)
      (router as any)[method!](
        path,
        await handler('server/api/' + file + '.ts'),
      );
    app.use(router);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = 'http://127.0.0.1:' + (server.address() as any).port;
    const request = (path: string, user = 2, method = 'GET', body?: unknown) =>
      fetch(base + path, {
        method,
        headers: {
          'x-test-user': String(user),
          'x-space-work': '1',
          'content-type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    async function ok(r: Response) {
      const text = await r.text();
      assert.equal(r.status, 200, text);
      return JSON.parse(text);
    }
    const key = randomUUID(),
      p = await ok(await request('/upts/demo', 2, 'POST', { clientKey: key }));
    assert.equal(
      (await ok(await request('/upts/demo', 2, 'POST', { clientKey: key }))).id,
      p.id,
    );
    assert.equal(await db.workProject.count(), 1);
    assert.equal(await db.workTask.count(), 9);
    let snapshot = await ok(await request('/upts'));
    assert.equal(snapshot.projects[0].upts.objects.length, 3);
    assert.equal(snapshot.tasks.length, 9);
    assert.equal(taskSummary(snapshot.tasks, snapshot.today).overdue, 1);
    assert.equal((await request('/upts', 0)).status, 401);
    assert.equal((await ok(await request('/upts', 4))).projects.length, 0);
    assert.equal(
      (await request(`/upts/projects/${p.id}/objects`, 4)).status,
      404,
    );
    await db.workProject.update({
      where: { id: p.id },
      data: { scope: 'TEAM' },
    });
    await db.workProjectMember.createMany({
      data: [
        { projectId: p.id, userId: 3, role: 'MEMBER' },
        { projectId: p.id, userId: 5, role: 'OBSERVER' },
      ],
    });
    assert.equal((await ok(await request('/upts', 5))).tasks.length, 9);
    const object = snapshot.projects[0].upts.objects[0];
    const progress = {
      version: object.version,
      goal: 'Цель',
      note: 'Передано для проверки',
      cadastral: 'DONE',
      rights: 'ACTIVE',
      restrictions: 'NA',
      documents: 'TODO',
      handover: 'TODO',
    };
    assert.equal(
      (
        await request(
          `/upts/projects/${p.id}/objects/${object.id}`,
          3,
          'PUT',
          progress,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request(
          `/upts/projects/${p.id}/objects/${object.id}`,
          5,
          'PUT',
          progress,
        )
      ).status,
      403,
    );
    await ok(
      await request(
        `/upts/projects/${p.id}/objects/${object.id}`,
        2,
        'PUT',
        progress,
      ),
    );
    assert.equal(
      (
        await request(
          `/upts/projects/${p.id}/objects/${object.id}`,
          2,
          'PUT',
          progress,
        )
      ).status,
      409,
    );
    const input = {
      clientKey: randomUUID(),
      name: 'Второй проект',
      description: '',
      color: '#2563eb',
      scope: 'TEAM',
      departmentId: null,
      groupId: null,
      startDate: null,
      dueDate: null,
      upts: {
        projectType: 'OTHER',
        status: 'INTAKE',
        basis: 'Письмо',
        initiator: 'Инициатор',
        receivedDate: null,
        completionNote: '',
      },
    };
    const p2 = await ok(await request('/projects', 2, 'POST', input));
    const link = {
      clientKey: randomUUID(),
      objectId: object.objectId,
      name: object.object.name,
      cadastralNumber: null,
      address: '',
      goal: 'Другой результат',
    };
    const linked = await ok(
      await request(`/upts/projects/${p2.id}/objects`, 2, 'POST', link),
    );
    assert.equal(linked.objectId, object.objectId);
    assert.equal(await db.uptsObject.count(), 3);
    assert.equal(linked.cadastral, 'TODO');
    assert.equal(
      (
        await ok(
          await request(`/upts/projects/${p2.id}/objects`, 2, 'POST', link),
        )
      ).id,
      linked.id,
    );
    const newObject = {
      clientKey: randomUUID(),
      objectId: null,
      name: 'Новый участок без номера',
      cadastralNumber: null,
      address: 'Условный адрес',
      goal: '',
    };
    const createdObject = await ok(
      await request(`/upts/projects/${p2.id}/objects`, 2, 'POST', newObject),
    );
    assert.equal(
      (
        await ok(
          await request(
            `/upts/projects/${p2.id}/objects`,
            2,
            'POST',
            newObject,
          ),
        )
      ).id,
      createdObject.id,
    );
    assert.equal(await db.uptsObject.count(), 4);
    const template = {
      objectId: object.id,
      items: [
        {
          clientKey: randomUUID(),
          title: '=HYPERLINK("https://invalid.example")',
        },
        { clientKey: randomUUID(), title: 'Проверить документы' },
      ],
    };
    assert.equal(
      (await request(`/upts/projects/${p2.id}/template`, 2, 'POST', template))
        .status,
      400,
    );
    assert.equal(
      (await request(`/upts/projects/${p.id}/template`, 5, 'POST', template))
        .status,
      403,
    );
    await ok(
      await request(`/upts/projects/${p.id}/template`, 2, 'POST', template),
    );
    await ok(
      await request(`/upts/projects/${p.id}/template`, 2, 'POST', template),
    );
    assert.equal(await db.workTask.count(), 11);
    const task = {
      clientKey: randomUUID(),
      title: 'Связанная задача',
      description: '',
      kind: 'TASK',
      status: 'TODO',
      priority: 'NORMAL',
      visibility: 'PROJECT',
      projectId: p2.id,
      departmentId: null,
      assigneeId: 2,
      participantIds: [],
      plannedDate: null,
      startDate: null,
      dueDate: null,
      blockedReason: '',
      uptsObjectId: object.id,
    };
    assert.equal((await request('/tasks', 2, 'POST', task)).status, 400);
    task.uptsObjectId = linked.id;
    const savedTask = await ok(await request('/tasks', 2, 'POST', task));
    assert.equal(savedTask.uptsObjectId, linked.id);
    const contract = await ok(
      await request(`/upts/projects/${p.id}/contracts`, 2, 'POST', {
        clientKey: randomUUID(),
        number: 'УПТС-12',
        name: 'Материалы',
        counterparty: 'Компания',
        signedDate: null,
        dueDate: null,
      }),
    );
    assert.ok(
      (
        await lstat(`${storage}/${p.id}/contracts/${contract.id}/shared`)
      ).isDirectory(),
    );
    const fileKey = randomUUID();
    const upload = (user: number, cid = contract.id, scope = 'SHARED') =>
      fetch(base + `/projects/${p.id}/files`, {
        method: 'POST',
        headers: {
          'x-test-user': String(user),
          'x-space-work': '1',
          'content-type': 'application/octet-stream',
          'x-file-name': encodeURIComponent('Материалы.txt'),
          'x-file-key': fileKey,
          'x-file-size': '5',
          'x-file-scope': scope,
          'x-file-contract': String(cid),
        },
        body: 'hello',
      });
    assert.equal((await upload(4)).status, 404);
    assert.equal((await upload(5)).status, 403);
    const file = await ok(await upload(3));
    assert.equal((await ok(await upload(3))).id, file.id);
    const stored = await db.workProjectFile.findUniqueOrThrow({
      where: { id: file.id },
    });
    assert.equal(stored.contractId, contract.id);
    assert.equal(
      await readFile(
        `${storage}/${p.id}/contracts/${contract.id}/shared/${stored.storageKey}`,
        'utf8',
      ),
      'hello',
    );
    assert.equal(
      (await ok(await request(`/projects/${p.id}/files?scope=SHARED`))).total,
      0,
    );
    assert.equal(
      (
        await ok(
          await request(
            `/projects/${p.id}/files?scope=SHARED&contractId=${contract.id}`,
          ),
        )
      ).total,
      1,
    );
    assert.equal(
      (await request(`/projects/${p2.id}/files?contractId=${contract.id}`))
        .status,
      404,
    );
    assert.equal(
      await (await request(`/projects/${p.id}/files/${file.id}`, 5)).text(),
      'hello',
    );
    assert.equal(
      (await request(`/projects/${p.id}/files/${file.id}`, 4)).status,
      404,
    );
    const report = await request(`/upts/export?projectId=${p.id}`);
    assert.equal(report.status, 200);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(Buffer.from(await report.arrayBuffer()) as any);
    assert.equal(book.worksheets.length, 6);
    assert.equal(book.getWorksheet('Задачи')!.rowCount, 12);
    const formulaRow = book
      .getWorksheet('Задачи')!
      .getColumn(4)
      .values.find((v) => typeof v === 'string' && v.startsWith('=HYPERLINK'));
    assert.equal(formulaRow, template.items[0]!.title);
    const scoped = await ok(
      await request(`/upts?projectId=${p.id}&employeeId=2`),
    );
    assert.ok(scoped.tasks.every((t: any) => t.assigneeId === 2));
    const employeeReport = await request(
      `/upts/export?projectId=${p.id}&employeeId=2`,
    );
    const eb = new ExcelJS.Workbook();
    await eb.xlsx.load(Buffer.from(await employeeReport.arrayBuffer()) as any);
    assert.equal(eb.getWorksheet('Задачи')!.rowCount, scoped.tasks.length + 1);
    const hiddenReport = await request(`/upts/export?projectId=${p.id}`, 4);
    const hb = new ExcelJS.Workbook();
    await hb.xlsx.load(Buffer.from(await hiddenReport.arrayBuffer()) as any);
    assert.equal(hb.getWorksheet('Задачи')!.rowCount, 1);
    const current = await db.workProject.findUniqueOrThrow({
      where: { id: p.id },
    });
    await ok(
      await request(`/projects/${p.id}/archive`, 2, 'POST', {
        version: current.version,
        archived: true,
      }),
    );
    assert.equal((await upload(3)).status, 403);
    assert.equal(
      (await request(`/upts/projects/${p.id}/template`, 2, 'POST', template))
        .status,
      403,
    );
    assert.equal(
      (await ok(await request(`/upts?projectId=${p.id}`))).projects.length,
      0,
    );
    assert.equal(
      (await ok(await request(`/upts?projectId=${p.id}&archived=1`))).projects
        .length,
      1,
    );
    assert.ok(
      (await db.auditLog.count({ where: { entityType: 'UptsReport' } })) > 0,
    );
  } finally {
    server.closeAllConnections();
    server.close();
    await db.$disconnect();
    await Promise.all(generated.map((f) => rm(f, { force: true })));
  }
});
