import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createApp, defineEventHandler, readMultipartFormData, toNodeListener } from 'h3'
import { readLabMultipartFormData, parseLabMultipart } from '../../server/utils/labMultipart'
import { handleFileUpload } from '../../server/utils/fileUploadHandler'

const fields = ['samplingDocumentFile', 'qualityDocumentFile', 'protocolDocumentFile']
const bytes = Buffer.from('%PDF-1.7\nbinary\0\xff\r\n=;test', 'latin1')
function form(filename: string) {
  const data = new FormData()
  data.set('payload', JSON.stringify({ note: 'Значение = 42; ОП13' }))
  for (const field of fields) data.append(field, new Blob([bytes], { type: 'application/pdf' }), filename)
  return data
}

test('real HTTP multipart: reproduce h3 filename loss and save all three fields with the fixed parser', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'lab-equals-'))
  const app = createApp()
  app.use('/old', defineEventHandler(async event => (await readMultipartFormData(event))?.map(part => ({ name: part.name, filename: part.filename }))))
  app.use('/save', defineEventHandler(async event => {
    const parts = await readLabMultipartFormData(event)
    const upload = await handleFileUpload(parts, { baseUploadDir: dir, fileFields: fields })
    for (const field of fields) {
      assert.ok(upload.fileDbPaths[field]?.endsWith('.pdf'))
      assert.deepEqual(await readFile(path.join(dir, upload.fileDbPaths[field]!)), bytes)
    }
    assert.equal(JSON.parse(upload.body.payload!).note, 'Значение = 42; ОП13')
    return { filenames: parts.filter(part => part.filename).map(part => part.filename), paths: upload.fileDbPaths }
  }))
  const server = createServer(toNodeListener(app))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`
  try {
    const old = await (await fetch(`${base}/old`, { method: 'POST', body: form('акт=ОП13.pdf') })).json() as any[]
    assert.equal(old.find(part => part.name === fields[0]).filename, undefined)
    for (const filename of ['акт=ОП13.pdf', '=протокол==42.pdf', 'материал; качество=1.pdf', 'обычный документ.pdf']) {
      const response = await fetch(`${base}/save`, { method: 'POST', body: form(filename) })
      assert.equal(response.status, 200)
      const result = await response.json() as any
      assert.deepEqual(result.filenames, fields.map(() => filename))
      assert.equal(new Set(Object.values(result.paths)).size, 3)
    }
    assert.equal((await fetch(`${base}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 400)
    await assert.rejects(parseLabMultipart(Buffer.from('broken'), 'multipart/form-data; boundary=missing'), { statusCode: 400 })
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()))
    await rm(dir, { recursive: true, force: true })
  }
})
