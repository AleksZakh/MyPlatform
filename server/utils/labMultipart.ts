import { createError, getHeader, readRawBody, type H3Event, type MultiPartData } from 'h3'

/** Native WHATWG parser preserves quoted filenames containing '=' and ';'.
 * h3 1.x splits Content-Disposition on those characters and can lose filename.
 * Keep the existing handler's MultiPartData contract and binary buffers.
 */
export async function parseLabMultipart(body: Uint8Array, contentType: string): Promise<MultiPartData[]> {
  try {
    const form = await new Response(Uint8Array.from(body), {
      headers: { 'Content-Type': contentType },
    }).formData()
    const parts: MultiPartData[] = []
    for (const [name, value] of form.entries()) {
      if (typeof value === 'string') {
        parts.push({ name, data: Buffer.from(value, 'utf8') })
      } else {
        parts.push({ name, filename: value.name, type: value.type, data: Buffer.from(await value.arrayBuffer()) })
      }
    }
    return parts
  } catch {
    throw createError({ statusCode: 400, message: 'Не удалось прочитать форму с файлами. Выберите файлы повторно.' })
  }
}

export async function readLabMultipartFormData(event: H3Event): Promise<MultiPartData[]> {
  const contentType = getHeader(event, 'content-type') || ''
  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    throw createError({ statusCode: 400, message: 'Ожидается форма с файлами (multipart/form-data).' })
  }
  const body = await readRawBody(event, false)
  if (!body?.length) throw createError({ statusCode: 400, message: 'Данные формы не найдены.' })
  return parseLabMultipart(body, contentType)
}
