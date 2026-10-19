import type { LibraryVideo } from '~~/shared/types/library-video';
// A small bounded fingerprint identifies the original file across reloads; never buffer a full video.
async function fingerprint(file: File) {
  const text = new TextEncoder().encode(`${file.name}\n${file.size}\n${file.lastModified}\n`);
  const first = new Uint8Array(await file.slice(0,1024*1024).arrayBuffer());
  const last = new Uint8Array(await file.slice(Math.max(0,file.size-1024*1024)).arrayBuffer());
  const data = new Uint8Array(text.length + first.length + last.length); data.set(text); data.set(first,text.length); data.set(last,text.length+first.length);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)), b => b.toString(16).padStart(2,'0')).join('');
}
function b64(value: unknown) { return btoa(Array.from(new TextEncoder().encode(JSON.stringify(value)), b => String.fromCharCode(b)).join('')); }
export function useVideoUpload() {
  const { user } = useUserSession();
  const busy = ref(false), progress = ref(0), message = ref(''), error = ref('');
  let controller: AbortController|null = null;
  function pause() { controller?.abort(); }
  onBeforeUnmount(pause);
  async function upload(file: File, form: { title: string; author: string; description: string; categoryIds: number[] }, existing: LibraryVideo|null, created: (id: string) => Promise<void>) {
    if (busy.value) return;
    busy.value = true; error.value = ''; controller = new AbortController(); const signal = controller.signal;
    try {
      if (!/\.mp4$/i.test(file.name)) throw new Error('Выберите MP4.');
      const limits = await $fetch<{ maxBytes: number; chunkBytes: number }>('/api/library/video-settings');
      if (!existing && file.size > limits.maxBytes) throw new Error(`Лимит: ${Math.round(limits.maxBytes/1024**2)} МиБ.`);
      message.value = 'Проверка файла…'; const hash = await fingerprint(file); signal.throwIfAborted();
      let id = existing?.id;
      // Client key persists through a lost POST response, avoiding duplicate drafts.
      const storageKey = `space-video-upload:${user.value?.id || 0}:${hash}`;
      let key = ''; try { key = localStorage.getItem(storageKey) || ''; } catch {}
      if (!key) { key = crypto.randomUUID(); try { localStorage.setItem(storageKey,key); } catch {} }
      if (!id) {
        const response = await $fetch.raw('/api/library/video-uploads', { method: 'POST', signal, retry: 0, headers: {
          'x-space-library':'1','Tus-Resumable':'1.0.0','Upload-Length':String(file.size),
          'Upload-Metadata': 'space '+b64({ title: form.title, author: form.author, categoryIds: form.categoryIds, filename: file.name, fingerprint: hash, clientKey: key }),
        } });
        const location = response.headers.get('location');
        const match = /^\/api\/library\/videos\/([a-f0-9-]{36})\/upload$/.exec(location || '');
        if (!match) throw new Error('Сервер не вернул адрес загрузки.'); id = match[1]!;
      }
      await created(id);
      const url = `/api/library/videos/${id}/upload`;
      async function head() {
        const r = await $fetch.raw(url, { method: 'HEAD', signal, retry: 0, headers: { 'Tus-Resumable':'1.0.0' } });
        if (r.headers.get('x-space-fingerprint') !== hash || Number(r.headers.get('upload-length')) !== file.size) throw new Error('Выберите исходный файл с тем же именем, размером и датой изменения.');
        const n = Number(r.headers.get('upload-offset')); if (!Number.isSafeInteger(n) || n<0 || n>file.size) throw new Error('Некорректная позиция загрузки.'); return n;
      }
      let offset = await head();
      // Save description through JSON API rather than a large HTTP metadata header.
      if (!existing) {
        const record = await $fetch<LibraryVideo>(`/api/library/videos/${id}`);
        await $fetch(`/api/library/videos/${id}`, { method:'PATCH', headers:{'x-space-library':'1'}, body:{...form,version:record.version}, retry:0 });
      }
      let retries = 0;
      while (offset < file.size) {
        signal.throwIfAborted(); progress.value = Math.floor(offset/file.size*100); message.value = `Загружено ${progress.value}%`;
        try {
          await $fetch.raw(url, { method:'PATCH',signal,retry:0, headers:{'x-space-library':'1','Tus-Resumable':'1.0.0','Upload-Offset':String(offset),'Content-Type':'application/offset+octet-stream'}, body:file.slice(offset,offset+limits.chunkBytes) });
          offset = await head(); retries = 0;
        } catch (e: any) {
          if (signal.aborted || ++retries>3 || (e.statusCode && ![408,409,429,500,502,503,504].includes(e.statusCode))) throw e;
          message.value = 'Соединение прервано. Проверяем принятую часть…';
          await new Promise(resolve => setTimeout(resolve,1000*retries)); offset = await head();
        }
      }
      progress.value = 100; message.value = 'Файл принят. Видео поставлено в очередь обработки.';
      try { localStorage.removeItem(storageKey); } catch {}
      return id;
    } catch (e: any) {
      if (signal.aborted) message.value = 'Загрузка приостановлена. Вы сможете продолжить её с карточки видео.';
      else error.value = e?.data?.message || e?.message || 'Не удалось загрузить видео.';
    } finally { busy.value = false; controller = null; }
  }
  return { busy, progress, message, error, pause, upload };
}
