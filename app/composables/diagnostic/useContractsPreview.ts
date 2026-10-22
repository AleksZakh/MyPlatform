
import {computed,ref,watch,onMounted,onBeforeUnmount} from 'vue';
import {contractStatus,moscowToday} from '~~/shared/utils/diagnostic-contracts';
import {directionLabels,type ContractRecord,type ContractStatus,type DiagnosticCatalog} from '~~/shared/types/diagnostic-contracts';
export function useContractsPreview(){
 const contracts=ref<ContractRecord[]>([]),catalog=ref<DiagnosticCatalog>({counterparties:[],projectTypes:[],supervisors:[],supervisorWarning:null,incomeContracts:[]});
 const rights=ref({CREATE:false,UPDATE:false,DELETE:false}),loading=ref(false),error=ref(''),trash=ref(false);
 const today=ref(moscowToday());let timer:ReturnType<typeof setInterval>|undefined;let generation=0;
 const status=ref<ContractStatus>('PLANNED'),search=ref(''),selectedId=ref<number|null>(null);
 const sortKey=ref<keyof ContractRecord>('number'),descending=ref(false);
 const formatDate=(v:string|null)=>v?v.split('-').reverse().join('.'):'—';
 const money=(v:string|null)=>v==null?'—':new Intl.NumberFormat('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v));
 const all=computed(()=>contracts.value.map(r=>({...r,status:contractStatus(r.date,r.finish,today.value)})));
 const counts=computed(()=>Object.fromEntries(['PLANNED','ACTIVE','COMPLETED'].map(s=>[s,all.value.filter(r=>r.status===s).length])));
 const rows=computed(()=>{const q=search.value.trim().toLocaleLowerCase('ru-RU');return all.value.filter(row=>(trash.value||row.status===status.value)&&(!q||[row.number,row.counterparty,row.executor,formatDate(row.date),formatDate(row.finish),row.buildings,money(row.amount),row.amount,directionLabels[row.direction]].join(' ').toLocaleLowerCase('ru-RU').includes(q))).sort((a,b)=>{const x=a[sortKey.value],y=b[sortKey.value];const result=sortKey.value==='amount'?Number(x??-1)-Number(y??-1):typeof x==='number'&&typeof y==='number'?x-y:String(x??'').localeCompare(String(y??''),'ru',{numeric:true});return descending.value?-result:result;});});
 const selected=computed(()=>rows.value.find(r=>r.id===selectedId.value)||null);
 watch(rows,()=>{if(!selected.value)selectedId.value=null;});
 function sort(key:keyof ContractRecord){if(sortKey.value===key)descending.value=!descending.value;else{sortKey.value=key;descending.value=false;}}
 function reset(){search.value='';selectedId.value=null;sortKey.value='number';descending.value=false;}
 function message(e:any){return e?.data?.data?.message||e?.data?.message||'Не удалось выполнить запрос. Повторите попытку.';}
 async function load(){
  const current=++generation;loading.value=true;error.value='';
  try{
   const list=await $fetch<ContractRecord[]>('/api/diagnostic/contracts',{query:{trash:trash.value?'1':'0'}});
   const [options,...grants]=await Promise.all([$fetch<DiagnosticCatalog>('/api/diagnostic/catalog'),...(['CREATE','UPDATE','DELETE'] as const).map(action=>$fetch<{allowed:boolean}>('/api/access/check',{query:{resource:'diagnostic.contracts',action}}))]);
   if(current!==generation)return;
   contracts.value=list;catalog.value=options;rights.value={CREATE:grants[0]!.allowed,UPDATE:grants[1]!.allowed,DELETE:grants[2]!.allowed};today.value=moscowToday();
  }catch(e){if(current!==generation)return;contracts.value=[];error.value=message(e);}finally{if(current===generation)loading.value=false;}
 }
 function savePreview(row:ContractRecord){const i=contracts.value.findIndex(r=>r.id===row.id);if(i<0)contracts.value.push(row);else contracts.value[i]=row;}
 watch(trash,()=>{reset();void load();});
 onMounted(()=>{void load();timer=setInterval(()=>{today.value=moscowToday();},30000);});
 onBeforeUnmount(()=>{generation++;clearInterval(timer);});
 return{contracts,catalog,rights,loading,error,trash,load,message,savePreview,status,search,selectedId,selected,sortKey,descending,rows,counts,formatDate,money,sort,reset};
}
