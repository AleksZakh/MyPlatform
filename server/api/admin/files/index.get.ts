import { defineEventHandler, getQuery, createError } from 'h3'
import { readdir, lstat } from 'node:fs/promises'
import { diskAdmin } from '../../../services/storage/disk'
import { fileReferences } from '../../../services/storage/references'
import { checkedStoragePath, normalizeStoragePath, storageUrl } from '../../../services/storage/paths'
import { storageDepartments, directoryExists } from '../../../services/storage/departments'

export default defineEventHandler(async event => {
  await diskAdmin(event)
  const query = getQuery(event), mode = String(query.mode || 'folders')
  const departments = await storageDepartments()
  const refs = mode === 'documents' ? await fileReferences() : []
  const byPath = new Map<string, typeof refs>()
  for (const ref of refs) {
    try { const key = normalizeStoragePath(ref.path); byPath.set(key, [...(byPath.get(key) || []), ref]) } catch {}
  }
  async function fileItem(relative: string) {
    let size: number | null = null, modified: string | null = null, state = 'missing'
    try { const entry = await lstat(await checkedStoragePath(relative)); if (!entry.isFile()) throw new Error(); size = entry.size; modified = entry.mtime.toISOString(); state = 'present' }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') state = 'unavailable' }
    const references = byPath.get(relative) || []
    return { name: references.find(r=>r.model==='workProjectFile')?.number || relative.split('/').at(-1)!, path: relative, folder: false, size, modified, state, references, url: storageUrl(relative) }
  }
  if (mode === 'documents') {
    const q = String(query.q || '').toLocaleLowerCase('ru'), type = String(query.type || '')
    const matches = [...byPath.entries()].filter(([p, r]) => (!type || r.some(x => x.type === type)) && (!q || (p + ' ' + r.map(x => `${x.type} ${x.number} ${x.object} ${x.location} ${x.samplingId}`).join(' ')).toLocaleLowerCase('ru').includes(q)))
    const page = Math.max(1, Number(query.page) || 1), pageSize = 100
    return { items: await Promise.all(matches.slice((page - 1) * pageSize, page * pageSize).map(([p]) => fileItem(p))), total: matches.length, page, pageSize }
  }
  try {
    const relative = normalizeStoragePath(String(query.path || ''), true)
    if (departments.some(d => d.path === relative) && !await directoryExists(relative)) return { items: [], total: 0, departments, initialized: false }
    const dir = await checkedStoragePath(relative)
    const entries = (await readdir(dir, { withFileTypes: true })).filter(e=>!e.name.startsWith('.')&&!e.isSymbolicLink()&&(e.isDirectory()||e.isFile()))
    const candidates=entries.map(e=>({name:e.name,path:[relative,e.name].filter(Boolean).join('/'),folder:e.isDirectory()}))
    if(!relative){
      const legacy=candidates.find(i=>i.path==='departments'&&i.folder);if(legacy)legacy.name='Ранее созданные каталоги отделов';
      for(const group of departments){
        const existing=candidates.find(i=>i.path===group.path&&i.folder)
        if(existing)existing.name=group.name
        else if(group.active||await directoryExists(group.path))candidates.push({name:group.name,path:group.path,folder:true})
      }
      const container=candidates.findIndex(i=>i.path==='groups'&&i.folder)
      if(container>=0&&departments.some(g=>g.path.startsWith('groups/')))candidates.splice(container,1)
    }
    candidates.sort((a,b)=>Number(b.folder)-Number(a.folder)||a.name.localeCompare(b.name,'ru'))
    const page=Math.max(1,Math.min(100000,Math.floor(Number(query.page)||1))),pageSize=100
    const slice=candidates.slice((page-1)*pageSize,page*pageSize)
    const paths=slice.filter(i=>!i.folder).map(i=>i.path)
    // A folder navigation must never scan the document tables for the whole portal.
    if(paths.length)for(const ref of await fileReferences(undefined,paths)){
      const key=normalizeStoragePath(ref.path);byPath.set(key,[...(byPath.get(key)||[]),ref])
    }
    const items=new Array(slice.length);let index=0
    await Promise.all(Array.from({length:Math.min(8,slice.length)},async()=>{
      for(;;){const i=index++;if(i>=slice.length)return;const entry=slice[i]!
        items[i]=entry.folder?{...entry,references:[],state:'present',size:null,modified:null}:await fileItem(entry.path)
      }
    }))
    return {items,total:candidates.length,page,pageSize,departments,initialized:true}

  } catch { throw createError({ statusCode: 400, message: 'Каталог недоступен или путь недопустим.' }) }
})
