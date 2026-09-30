import { AccessAction } from '@prisma/client';
import { defineEventHandler, readMultipartFormData, createError } from 'h3';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { prisma } from '../../../utils/prisma';
import { requirePermission } from '../../../services/access-control.service';

const BASE_UPLOAD_DIR = path.resolve(process.env.LAB_FILES_ROOT || '/var/www/uploads-storage/files');

// Retain the existing object / location / date layout. Database paths are relative
// to /files/, as expected by FileViewerModal and the shared upload handler.
function safeSegment(value: string): string {
  const cleaned = value.normalize('NFC').replace(/[\/\\?%*:|"<>\x00-\x1f\x7f]/g, '_')
    .replace(/\s+/g, '_').replace(/^\.+|\.+$/g, '').slice(0, 50);
  return cleaned || 'unnamed';
}

function detectDocument(bytes: Buffer): { extension: 'pdf' | 'jpg'; mime: string } | null {
  // Detect the bytes, never trust the filename or the remote Content-Type alone.
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: 'jpg', mime: 'image/jpeg' };
  }
  if (bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
    return { extension: 'pdf', mime: 'application/pdf' };
  }
  return null;
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'lab.sampling-tests', AccessAction.UPDATE);
  const form = await readMultipartFormData(event);
  if (!form) throw createError({ statusCode: 400, statusMessage: 'Form required' });
  const files = form.filter(field => field.name === 'file' && field.filename);
  if (files.length !== 1 || !files[0]?.data.length) {
    throw createError({ statusCode: 400, statusMessage: 'Exactly one file required' });
  }
  const file = files[0];
  if (file.data.length > 50 * 1024 * 1024) throw createError({ statusCode: 413, statusMessage: 'File too large' });
  const document = detectDocument(file.data);
  if (!document) {
    throw createError({ statusCode: 415, statusMessage: 'PDF or JPEG required', message: 'Допускаются документы PDF и JPEG.' });
  }
  const ids = form.filter(field => !field.filename && ['dbRecordId', 'samplingTestId'].includes(field.name || ''))
    .map(field => Number(field.data.toString('utf8').trim()));
  const id = ids[0];
  if (id === undefined || !Number.isSafeInteger(id) || id <= 0 || ids.some(value => value !== id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or conflicting record ID' });
  }
  const row = await prisma.samplingTest.findFirst({ where: { id, deletedAt: null },
    include: { testLocation: { include: { testObject: true } } } });
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Sampling record not found' });
  // Metadata is taken from the selected Space record, not from untrusted form fields.
  const segments = [safeSegment(row.testLocation.testObject.name), safeSegment(row.testLocation.name),
    row.samplingDate.toISOString().slice(0, 10)];
  const name = `act_${safeSegment(row.samplingActNumber)}_${id}_${randomUUID()}.${document.extension}`;
  const directory = path.join(BASE_UPLOAD_DIR, ...segments);
  const diskPath = path.join(directory, name);
  const relativePath = [...segments, name].join('/');
  await mkdir(directory, { recursive: true });
  await writeFile(diskPath, file.data, { flag: 'wx' });
  try {
    // Do not overwrite a link changed by another request while the file was saved.
    const changed = await prisma.samplingTest.updateMany({
      where: { id, deletedAt: null, samplingDocumentPath: row.samplingDocumentPath },
      data: { samplingDocumentPath: relativePath },
    });
    if (changed.count !== 1) throw createError({ statusCode: 409, statusMessage: 'Record changed; retry after review' });
  } catch (error) {
    await unlink(diskPath).catch(() => undefined);
    throw error;
  }
  return { success: true, attached: true, samplingTestId: id,
    message: `Файл сохранён и привязан к акту ${row.samplingActNumber} (ID=${id})`,
    path: relativePath, url: '/files/' + relativePath.split('/').map(encodeURIComponent).join('/') };
});
