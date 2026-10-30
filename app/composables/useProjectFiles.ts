import type { ProjectFileDTO, ProjectFileList, ProjectFileScope } from '~~/shared/types/project-files';

export function useProjectFiles(projectId: number, contractId?:number, defaultScope:ProjectFileScope='PRIVATE') {
  const scope = ref<ProjectFileScope>(defaultScope), trash = ref(false), data = ref<ProjectFileList | null>(null);
  const error = ref(''), loading = ref(false), busy = ref(false), selected = ref<ProjectFileDTO | null>(null);
  const queue = ref<{ key: string; file: File; progress: number; state: string }[]>([]);
  const base = `/api/work/projects/${projectId}/files`;
  let request: XMLHttpRequest | null = null, active = true, generation = 0;
  async function load(page = 1) {
    const serial = ++generation; loading.value = true; error.value = ''; data.value = null;
    try { const result = await $fetch<ProjectFileList>(base, { query: { contractId, scope: scope.value, trash: trash.value ? '1' : '0', page } }); if (active && serial === generation) data.value = result; }
    catch (e: any) { if (active && serial === generation) error.value = e.data?.message || 'Не удалось загрузить файлы.'; }
    finally { if (active && serial === generation) loading.value = false; }
  }
  function choose(files: File[]) {
    if (busy.value || !data.value?.canUpload || trash.value) return;
    error.value = '';
    for (const file of files) {
      if (!file.size || file.size > data.value.maxBytes || file.name.length > 240 || /[\/\\\x00-\x1f\x7f]/.test(file.name)) {
        error.value = 'Некоторые файлы не добавлены: проверьте размер и длину имени (до 240 символов).'; continue;
      }
      queue.value.push({ key: crypto.randomUUID(), file, progress: 0, state: 'Ожидает' });
    }
  }
  async function upload() {
    if (busy.value || !data.value?.canUpload || trash.value) return;
    busy.value = true; error.value = '';
    const selectedScope = scope.value;
    try {
      for (const item of queue.value) {
        if (!active) break;
        if (item.state === 'Загружен') continue;
        item.state = 'Загрузка'; item.progress = 0;
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest(); request = xhr;
          xhr.open('POST', base); xhr.timeout = 15 * 60_000;
          xhr.setRequestHeader('content-type', 'application/octet-stream'); xhr.setRequestHeader('x-space-work', '1');
          if(contractId)xhr.setRequestHeader('x-file-contract',String(contractId));
          xhr.setRequestHeader('x-file-key', item.key); xhr.setRequestHeader('x-file-name', encodeURIComponent(item.file.name));
          xhr.setRequestHeader('x-file-size', String(item.file.size)); xhr.setRequestHeader('x-file-scope', selectedScope);
          xhr.upload.onprogress = e => { if (e.lengthComputable) item.progress = Math.round(e.loaded / e.total * 100); };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) { item.state = 'Загружен'; item.progress = 100; resolve(); }
            else { let message = xhr.status === 413 ? 'Файл превышает лимит сервера загрузки.' : 'Не удалось сохранить файл.';
              try { message = JSON.parse(xhr.responseText).message || message; } catch {} reject(new Error(message)); }
          };
          xhr.onerror = () => reject(new Error('Связь прервана. Обновите список перед повторной загрузкой.'));
          xhr.onabort = () => reject(new Error('Загрузка остановлена. Проверьте список: сервер мог успеть сохранить файл.'));
          xhr.ontimeout = () => reject(new Error('Время загрузки истекло. Проверьте список файлов.'));
          xhr.send(item.file);
        });
      }
    } catch (e: any) { error.value = e.message; for (const item of queue.value) if (item.state === 'Загрузка') item.state = 'Не завершён'; }
    finally { request = null; busy.value = false; if (active) { const message = error.value; await load(); if (message) error.value = message; } }
  }
  async function changeState() {
    const f = selected.value; if (!f || busy.value) return;
    busy.value = true; error.value = '';
    try { await $fetch(base + '/' + f.id, { method: 'PATCH', headers: { 'x-space-work': '1' }, body: { version: f.version, deleted: !f.deletedAt } }); selected.value = null; await load(); }
    catch (e: any) { error.value = e.data?.message || 'Не удалось изменить файл.'; }
    finally { busy.value = false; }
  }
  watch([scope, trash], () => { selected.value = null; queue.value = []; load(); });
  onMounted(() => load());
  onBeforeUnmount(() => { active = false; generation++; request?.abort(); });
  return { scope, trash, data, error, loading, busy, selected, queue, base, load, choose, upload, changeState, cancel: () => request?.abort() };
}
