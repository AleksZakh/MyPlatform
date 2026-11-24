import test from 'node:test'
import assert from 'node:assert/strict'
import { effectScope, reactive } from 'vue'
import { useLabFilterFacets } from '../../app/composables/useLabFilterFacets'
import { normalizeLabFilters, emptyLabFacetOptions } from '../../shared/utils/lab-filter-values'
const tick = (ms=240) => new Promise(resolve=>setTimeout(resolve,ms))
test('slow old response cannot overwrite new draft; disposal and invalid dates cancel requests', async () => {
  const previous=(globalThis as any).$fetch
  const requests:{resolve:(value:any)=>void,signal:AbortSignal,body:any}[]=[]
  ;(globalThis as any).$fetch=(_url:string,options:any)=>new Promise(resolve=>requests.push({resolve,signal:options.signal,body:options.body}))
  const scope=effectScope()
  try {
    const draft=reactive(normalizeLabFilters())
    const state=scope.run(()=>useLabFilterFacets(()=>draft))!
    await tick();assert.equal(requests.length,1)
    draft.objName='Объект А';await tick();assert.equal(requests.length,2)
    assert.equal(requests[0]!.signal.aborted,true)
    requests[1]!.resolve({total:2,options:{...emptyLabFacetOptions(),materialName:['Бетон']}});await tick(0)
    requests[0]!.resolve({total:100,options:{...emptyLabFacetOptions(),materialName:['Старый ответ']}});await tick(0)
    assert.equal(state.total.value,2);assert.deepEqual(state.options.value.materialName,['Бетон'])
    draft.sDateStart='2026-11-10';draft.sDateEnd='2026-11-01';await tick()
    assert.equal(requests.length,2);assert.match(state.error.value,/позже/);assert.equal(state.loading.value,false)
    draft.sDateEnd=null;await tick();assert.equal(requests.length,3)
    scope.stop();assert.equal(requests[2]!.signal.aborted,true)
    requests[2]!.resolve({total:999,options:emptyLabFacetOptions()});await tick(0)
    assert.equal(state.total.value,null)
  } finally { scope.stop();(globalThis as any).$fetch=previous }
})
