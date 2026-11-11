export interface StorageReference { model: string; entity: string; id: number; field: string; path: string; type: string; number: string; date: string | null; samplingId: number | null; object: string; location: string; deleted: boolean }
export interface StorageItem { name: string; path: string; folder: boolean; size: number | null; modified: string | null; state: string; references: StorageReference[]; url?: string }
export function useStorageManager() {
  const departments = ref<import('~~/shared/types/department-storage').DepartmentStorage[]>([]), initialized = ref(true)
  const mode = ref<'folders' | 'documents'>('folders'), directory = ref(''), query = ref(''), type = ref(''), page = ref(1)
  const items = ref<StorageItem[]>([]), total = ref(0), busy = ref(false), error = ref(''), selected = ref<StorageItem | null>(null), checked = ref<string[]>([])
  let request = 0, controller:AbortController|null=null
  type Listing={items:StorageItem[];total:number;departments?:import('~~/shared/types/department-storage').DepartmentStorage[];initialized?:boolean}
  const cache=new Map<string,{at:number;data:Listing}>()
  onBeforeUnmount(()=>{request++;controller?.abort();cache.clear()})
  async function refresh(useCache:unknown=false) {
    const token=++request;controller?.abort();controller=new AbortController();busy.value=true;error.value='';items.value=[];checked.value=[];selected.value=null
    const params={mode:mode.value,path:directory.value,q:query.value,type:type.value,page:page.value},key=JSON.stringify(params)
    if(useCache!==true)cache.clear()
    try {
      const cached=mode.value==='folders'&&useCache===true?cache.get(key):undefined
      const data=cached&&Date.now()-cached.at<10000?cached.data:await $fetch<Listing>('/api/admin/files',{query:params,signal:controller.signal,timeout:25000,retry:0})
      if(token!==request)return
      if(mode.value==='folders'){cache.delete(key);cache.set(key,{at:cached?.data===data?cached.at:Date.now(),data});while(cache.size>30)cache.delete(cache.keys().next().value!)}
      if (token !== request) return
      items.value = data.items; total.value = data.total; checked.value = []
      if (data.departments) departments.value = data.departments
      initialized.value = data.initialized !== false
      selected.value = data.items.find(x => x.path === selected.value?.path) || null
    } catch (e: any) { if (token === request) error.value = e.data?.message || ([504,503].includes(e.status||e.statusCode)||e.name==='AbortError'?'Каталог не успел загрузиться. Нажмите «Обновить» для повторной попытки.':'Не удалось загрузить каталог. Повторите попытку.') }
    finally { if (token === request) busy.value = false }
  }
  function open(item: StorageItem) {
    if (item.folder) { directory.value = item.path; page.value = 1; refresh(true) }
    else selected.value = item
  }
  watch(mode, () => { page.value = 1; selected.value = null; refresh() })
  async function mutate(body: Record<string, unknown>) {
    await $fetch('/api/admin/files/mutate', { method: 'POST', body })
    cache.clear(); await refresh()
  }
  async function upload(file: File, samplingId: string, purpose: string, replacePath = '', departmentDirectory = '') {
    const form = new FormData()
    form.append('file', file); form.append('samplingId', samplingId); form.append('type', purpose)
    if (replacePath) form.append('replacePath', replacePath)
    if (departmentDirectory) form.append('departmentDirectory', departmentDirectory)
    await $fetch('/api/admin/files/upload', { method: 'POST', headers: { 'x-space-storage': '1' }, body: form })
    cache.clear(); await refresh()
  }
  return { departments, initialized, mode, directory, query, type, page, items, total, busy, error, selected, checked, refresh, open, mutate, upload }
}
