import { computed, ref, watch } from 'vue';
import sample from '~/data/diagnostic/structures-preview.json';
import type { StructureRecord, StructureSortKey } from '~~/shared/types/diagnostic-structures';
import { blankStructureFilters, filterStructures, sortStructures, structureOptions, structureRangeError } from '~~/shared/utils/diagnostic-structures';

export function useStructuresPreview() {
  // Deliberately component-local: preview rows never persist to storage or the server.
  const rows=ref<StructureRecord[]>(sample.map(row=>({...row})));
  const filters=ref(blankStructureFilters()), sortKey=ref<StructureSortKey>('roadName'), descending=ref(false);
  const page=ref(1), pageSize=ref(25), selectedId=ref('');
  const rangeError=computed(()=>structureRangeError(filters.value));
  const filtered=computed(()=>sortStructures(filterStructures(rows.value,filters.value),sortKey.value,descending.value));
  const pageCount=computed(()=>Math.max(1,Math.ceil(filtered.value.length/pageSize.value)));
  const pageRows=computed(()=>filtered.value.slice((page.value-1)*pageSize.value,page.value*pageSize.value));
  const selected=computed(()=>pageRows.value.find(row=>row.id===selectedId.value)||null);
  const options=computed(()=>({
    roads:structureOptions(rows.value,'roadName'), management:structureOptions(rows.value,'management'),
    regions:structureOptions(rows.value,'region'), kinds:structureOptions(rows.value,'structureName'), types:structureOptions(rows.value,'issoType'),
  }));
  const activeFilters=computed(()=>Object.values(filters.value).filter(value=>Array.isArray(value)?value.length:typeof value==='string'?value.trim():value).length);
  watch([filters,pageSize,sortKey,descending],()=>{page.value=1;},{deep:true,flush:'sync'});
  watch(pageCount,count=>{page.value=Math.min(page.value,count);},{flush:'sync'});
  watch(pageRows,list=>{if(!list.some(row=>row.id===selectedId.value))selectedId.value=list[0]?.id||'';},{immediate:true,flush:'sync'});
  function sort(key:StructureSortKey){if(sortKey.value===key)descending.value=!descending.value;else{sortKey.value=key;descending.value=false;}}
  function reset(){filters.value=blankStructureFilters();page.value=1;}
  function addPreview(records:StructureRecord[]) {
    const seen=new Set(rows.value.map(row=>row.issoCode.trim().toLocaleLowerCase('ru-RU')));
    const added=records.filter(row=>{const code=row.issoCode.trim().toLocaleLowerCase('ru-RU');if(seen.has(code))return false;seen.add(code);return true;});
    rows.value=[...rows.value,...added];reset();
    return added.length;
  }
  function restoreSample(){rows.value=sample.map(row=>({...row}));reset();}
  return {rows,filters,sortKey,descending,page,pageSize,pageCount,pageRows,selectedId,selected,options,rangeError,filtered,activeFilters,sort,reset,addPreview,restoreSample};
}
