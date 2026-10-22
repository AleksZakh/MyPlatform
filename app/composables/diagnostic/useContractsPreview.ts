import { computed, ref, watch } from 'vue';
import { demoContracts, type ContractPreview, type ContractStatus } from '~/utils/diagnostic/contracts-demo';
export function useContractsPreview(){
 const status=ref<ContractStatus>('PLANNED'),search=ref(''),selectedId=ref<number|null>(null);
 const sortKey=ref<keyof ContractPreview>('number'),descending=ref(false);
 const formatDate=(v:string)=>v.split('-').reverse().join('.');
 const money=(v:number)=>new Intl.NumberFormat('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2}).format(v);
 const counts=computed(()=>Object.fromEntries(['PLANNED','ACTIVE','COMPLETED'].map(s=>[s,demoContracts.filter(r=>r.status===s).length])));
 const rows=computed(()=>{const q=search.value.trim().toLocaleLowerCase('ru-RU');return demoContracts.filter(row=>row.status===status.value&&(!q||[row.number,row.counterparty,row.executor,formatDate(row.date),formatDate(row.finish),row.buildings,money(row.amount),row.amount,row.direction==='INCOME'?'Доходный':'Расходный'].join(' ').toLocaleLowerCase('ru-RU').includes(q))).sort((a,b)=>{const x=a[sortKey.value],y=b[sortKey.value];const result=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'ru',{numeric:true});return descending.value?-result:result;});});
 const selected=computed(()=>rows.value.find(r=>r.id===selectedId.value)||null);
 watch(rows,()=>{if(!selected.value)selectedId.value=null;});
 function sort(key:keyof ContractPreview){if(sortKey.value===key)descending.value=!descending.value;else{sortKey.value=key;descending.value=false;}}
 function reset(){search.value='';selectedId.value=null;sortKey.value='number';descending.value=false;}
 return{status,search,selectedId,selected,sortKey,descending,rows,counts,formatDate,money,sort,reset};
}
