// node --test tests/deletion.test.cjs (нужен установленный typescript)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { Prisma } = require('@prisma/client');
function moduleFrom(file, mocks) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: n => n in mocks ? mocks[n] : require(n), setTimeout, console });
  return exports;
}
function fixture({ denied = false, auditFailure = false, kind = 'registry', linked = false, deleted = false, conflict = false } = {}) {
  let state = {
    registry: { id: 1, receiptMaterialId: 2, testProtocolId: 3, samplingDocumentPath: 'act.pdf', deletedAt: deleted ? new Date() : null, deletedBy: null },
    receipt: { id: 2, qualityDocumentPath: 'quality.pdf', deletedAt: null, deletedBy: null },
    protocol: { id: 3, protocolDocumentPath: 'protocol.webp', deletedAt: null, deletedBy: null }, audit: [],
  };
  let transactions = 0;
  let requestedKey;
  const h3 = { getRouterParam: () => String(kind === 'registry' ? 1 : kind === 'receipt' ? 2 : 3), readBody: async e => e.body,
    createError: x => Object.assign(new Error(x.message), x) };
  const input = moduleFrom('server/utils/deletion-input.ts', { h3 });
  const delegate = name => ({
    findUnique: async () => structuredClone(state[name]),
    findUniqueOrThrow: async () => structuredClone(state[name]),
    findFirst: async () => linked ? { id: 1 } : null,
    update: async ({ data }) => { Object.assign(state[name], data); return structuredClone(state[name]); },
  });
  const tx = { samplingTest: delegate('registry'), receiptMaterial: delegate('receipt'), testProtocol: delegate('protocol') };
  const prisma = { $transaction: async fn => {
    transactions++;
    const before = structuredClone(state);
    try {
      const result = await fn(tx);
      if (conflict && transactions === 1) throw new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 'test' });
      return result;
    } catch (e) { state = before; throw e; }
  } };
  const service = moduleFrom('server/services/lab/registry-delete.service.ts', {
    h3, '~~/server/utils/prisma': { prisma }, '~~/server/utils/deletion-input': input,
    '~~/server/services/access-control.service': { requirePermission: async (e, key, action) => {
      requestedKey = key; assert.equal(action, 'DELETE'); if (denied) throw Object.assign(new Error('denied'), { statusCode: 403 }); return { userId: 7 };
    } },
    './manufacturer-api.service': { manufacturerAuditActor: async () => ({ actorUserId: 7, actorEmail: 'test-user' }) },
    '~~/server/utils/auditLog': { writeAuditEvent: async p => {
      if (auditFailure) throw new Error('audit unavailable'); state.audit.push({ type: p.entityType, reason: p.afterData.deletionReason });
    } },
  });
  return { run: (reason = 'Ошибка ввода') => service.deleteLabRecord({ body: { reason } }, kind), get: () => state,
    count: () => transactions, key: () => requestedKey, input };
}
test('no DELETE permission: no transaction', async () => { const f = fixture({ denied: true }); await assert.rejects(f.run(), { statusCode: 403 }); assert.equal(f.count(), 0); });
test('reason validation before DB', async () => {
  for (const reason of ['', '  ', null, 'x'.repeat(1001), 'x\0y']) {
    const f = fixture(); await assert.rejects(f.run(reason), { statusCode: 400 }); assert.equal(f.count(), 0);
  }
});
test('registry soft-deletes aggregate, preserves all document paths, audits reason', async () => {
  const f = fixture(); await f.run(); const s = f.get();
  for (const key of ['registry', 'receipt', 'protocol']) assert.ok(s[key].deletedAt);
  assert.equal(s.registry.samplingDocumentPath, 'act.pdf'); assert.equal(s.receipt.qualityDocumentPath, 'quality.pdf'); assert.equal(s.protocol.protocolDocumentPath, 'protocol.webp');
  assert.equal(s.audit.length, 3); assert.ok(s.audit.every(x => x.reason === 'Ошибка ввода')); assert.equal(f.key(), 'lab.sampling-tests');
});
test('audit failure rolls back all changes', async () => {
  const f = fixture({ auditFailure: true }); await assert.rejects(f.run());
  for (const k of ['registry', 'receipt', 'protocol']) assert.equal(f.get()[k].deletedAt, null);
  assert.equal(f.get().audit.length, 0);
});
test('repeat deletion is idempotent', async () => {
  const f = fixture(); await f.run(); const date = f.get().registry.deletedAt.getTime();
  assert.equal((await f.run()).alreadyDeleted, true); assert.equal(f.get().audit.length, 3); assert.equal(f.get().registry.deletedAt.getTime(), date);
});
for (const kind of ['receipt', 'protocol']) {
  test(`${kind}: cannot independently delete a linked row`, async () => {
    const f = fixture({ kind, linked: true }); await assert.rejects(f.run(), { statusCode: 409 }); assert.equal(f.get()[kind].deletedAt, null);
  });
  test(`${kind}: standalone row uses its own resource`, async () => {
    const f = fixture({ kind }); await f.run(); assert.equal(f.key(), kind === 'receipt' ? 'lab.receipt-materials' : 'lab.test-protocols'); assert.equal(f.get().registry.deletedAt, null); assert.equal(f.get().audit.length, 1);
  });
}
test('serialization conflict retries whole transaction without duplicate audit', async () => {
  const f = fixture({ conflict: true }); await f.run(); assert.equal(f.count(), 2); assert.equal(f.get().audit.length, 3);
});
test('strict IDs reject partial/negative/overflow IDs', () => {
  const f = fixture(); for (const value of ['12x', '-1', '0', '1.5', '2147483648']) assert.throws(() => f.input.deletionId(value));
  assert.equal(f.input.deletionId('123'), 123);
});
