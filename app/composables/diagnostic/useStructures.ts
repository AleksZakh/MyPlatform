import {computed,onMounted,onBeforeUnmount,ref,watch} from 'vue';
import type {StructureSortKey} from '~~/shared/types/diagnostic-structures';
import type {StructureCatalog,StructureDetail,StructureListResponse,StructureListRow} from '~~/shared/types/diagnostic-structures-api';
import {blankStructureFilters,structureRangeError} from '~~/shared/utils/diagnostic-structures';
export function structureRequestError(error:unknown):string {
  const e=error as {statusCode?:number;status?:number;data?:{message?:string;data?:{message?:string}}};
  if(e?.statusCode===401||e?.status===401)return 'Сеанс завершён. Войдите в приложение повторно.';
  if(e?.statusCode===403||e?.status===403)return 'Нет права на просмотр справочника «Сооружения».';
  return e?.data?.data?.message||e?.data?.message||'Не удалось загрузить данные. Повторите запрос.';
}
export function useStructures(){
  const filters=ref(blankStructureFilters()),sortKey=ref<StructureSortKey>('roadName'),descending=ref(false);
  const page=ref(1),pageSize=ref(25),pageCount=ref(1),total=ref(0),matched=ref(0),pageRows=ref<StructureListRow[]>([]);
  const selectedId=ref(''),selected=ref<StructureDetail|null>(null),loading=ref(true),detailLoading=ref(false);
  const loadError=ref(''),detailError=ref(''),catalogError=ref('');
  const options=ref<StructureCatalog>({roads:[],management:[],regions:[],kinds:[],types:[]});
  const rangeError=computed(()=>structureRangeError(filters.value));
  const activeFilters=computed(()=>Object.values(filters.value).filter(v=>Array.isArray(v)?v.length:typeof v==='string'?v.trim():v).length);
  let mounted=false,disposed=false,acceptingPage=false,listGeneration=0,detailGeneration=0,catalogGeneration=0;
  let timer:ReturnType<typeof setTimeout>|undefined,listAbort:AbortController|undefined,detailAbort:AbortController|undefined,catalogAbort:AbortController|undefined;
  function cancelList(){listGeneration++;listAbort?.abort();if(timer)clearTimeout(timer);timer=undefined;}
  function clearList(){pageRows.value=[];matched.value=0;selectedId.value='';selected.value=null;}
  async function fetchList(){
    cancelList();clearList();loadError.value='';
    if(disposed||rangeError.value){loading.value=false;return;}
    const generation=listGeneration;listAbort=new AbortController();loading.value=true;
    try{
      const result=await $fetch<StructureListResponse>('/api/diagnostic/structures',{signal:listAbort.signal,query:{...filters.value,page:page.value,pageSize:pageSize.value,sortKey:sortKey.value,descending:descending.value}});
      if(disposed||generation!==listGeneration)return;
      acceptingPage=true;page.value=result.page;acceptingPage=false;
      pageCount.value=result.pageCount;total.value=result.total;matched.value=result.matched;pageRows.value=result.items;
      selectedId.value=result.items[0]?.id||'';
    }catch(e){if(!disposed&&generation===listGeneration){clearList();total.value=0;pageCount.value=1;loadError.value=structureRequestError(e);}}
    finally{if(generation===listGeneration&&!disposed)loading.value=false;}
  }
  function schedule(){
    if(!mounted||disposed)return;
    cancelList();clearList();loadError.value='';loading.value=!rangeError.value;
    if(!rangeError.value)timer=setTimeout(()=>void fetchList(),250);
  }
  async function fetchCatalog(){
    const generation=++catalogGeneration;catalogAbort?.abort();catalogAbort=new AbortController();catalogError.value='';
    try{const result=await $fetch<StructureCatalog>('/api/diagnostic/structures/catalog',{signal:catalogAbort.signal});if(!disposed&&generation===catalogGeneration)options.value=result;}
    catch(e){if(!disposed&&generation===catalogGeneration){options.value={roads:[],management:[],regions:[],kinds:[],types:[]};catalogError.value=structureRequestError(e);}}
  }
  async function fetchDetail(){
    const generation=++detailGeneration,id=selectedId.value;detailAbort?.abort();selected.value=null;detailError.value='';detailLoading.value=false;
    if(!id||disposed)return;
    detailAbort=new AbortController();detailLoading.value=true;
    try{const result=await $fetch<StructureDetail>(`/api/diagnostic/structures/${id}`,{signal:detailAbort.signal});if(!disposed&&generation===detailGeneration&&id===selectedId.value)selected.value=result;}
    catch(e){if(!disposed&&generation===detailGeneration)detailError.value=structureRequestError(e);}
    finally{if(!disposed&&generation===detailGeneration)detailLoading.value=false;}
  }
  watch([filters,pageSize,sortKey,descending],()=>{page.value=1;schedule();},{deep:true,flush:'sync'});
  watch(page,()=>{if(!acceptingPage)schedule();},{flush:'sync'});
  watch(selectedId,()=>void fetchDetail(),{flush:'sync'});
  function sort(key:StructureSortKey){if(sortKey.value===key)descending.value=!descending.value;else{sortKey.value=key;descending.value=false;}}
  function reset(){filters.value=blankStructureFilters();page.value=1;}
  async function refresh(){await Promise.all([fetchList(),fetchCatalog()]);}
  onMounted(()=>{mounted=true;void refresh();});
  onBeforeUnmount(()=>{disposed=true;cancelList();detailGeneration++;catalogGeneration++;detailAbort?.abort();catalogAbort?.abort();});
  return {filters,sortKey,descending,page,pageSize,pageCount,total,matched,pageRows,selectedId,selected,options,rangeError,activeFilters,loading,loadError,catalogError,detailLoading,detailError,sort,reset,refresh,retryDetail:fetchDetail};
}
