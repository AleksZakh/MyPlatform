import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createServer } from 'node:http'
import { createApp, toNodeListener, defineEventHandler, getQuery, setHeader, createError } from 'h3'

// Fixture models soft deletion as in PostgreSQL. Execute the real endpoint over HTTP.
const rows = [
  { name: 'ПЛП 5', deletedAt: null },
  { name: 'ПЛП 10', deletedAt: new Date('2026-11-01') },
  { name: 'ПЛП 1', deletedAt: null },
]
const delegate = { async findMany(args) {
  return rows.filter(row => Object.entries(args.where).every(([key, value]) =>
    key === 'deletedAt' ? row.deletedAt === value : row[key]?.toLowerCase().includes(value.contains.toLowerCase()),
  )).sort((a, b) => a.name.localeCompare(b.name, 'ru')).map(row => ({ name: row.name }))
} }
const catalogs = ['plp', 'inspector', 'manufacturer', 'material', 'testObject', 'testLocation']
Object.assign(globalThis, {
  labReferenceTestRuntime: { defineEventHandler, getQuery, setHeader, createError },
  labReferenceTestPrisma: class { constructor() { return Object.fromEntries(catalogs.map(name => [name, delegate])) } },
})

test('reference endpoint excludes soft-deleted entries with and without search, ignores attempts to override filter', async () => {
  const result = await build({ entryPoints: ['server/api/incoming-control/fieldsInfo.get.ts'], bundle: true, write: false, format: 'esm', plugins: [{ name: 'boundaries', setup(b) {
    b.onResolve({ filter: /^(h3|@prisma\/client)$/ }, args => ({ path: args.path, namespace: 'runtime' }))
    b.onLoad({ filter: /.*/, namespace: 'runtime' }, args => ({ contents: args.path === 'h3'
      ? 'export const {defineEventHandler,getQuery,setHeader,createError}=globalThis.labReferenceTestRuntime;'
      : 'export const PrismaClient=globalThis.labReferenceTestPrisma;' }))
  } }] })
  const { default: handler } = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'))
  const app = createApp().use(handler)
  const server = createServer(toNodeListener(app))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    for (const model of catalogs) {
      const response = await fetch(`${base}/?model=${model}&field=name&deletedAt=anything&includeDeleted=true`)
      assert.equal(response.status, 200)
      assert.equal(response.headers.get('cache-control'), 'no-store')
      assert.deepEqual(await response.json(), ['ПЛП 1', 'ПЛП 5'])
    }
    const query = term => fetch(`${base}/?model=plp&field=name&search=${encodeURIComponent(term)}`).then(r => r.json())
    assert.deepEqual(await query('ПЛП 10'), [])
    assert.deepEqual(await query('плп 5'), ['ПЛП 5'])
    assert.equal((await fetch(`${base}/?model=user&field=email`)).status, 400)
    assert.equal((await fetch(`${base}/?model=plp&field=deletedAt`)).status, 400)
  } finally {
    server.closeAllConnections()
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()))
  }
})
