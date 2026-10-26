import {computed,ref} from 'vue';
export interface WorkExample {id:number;code:string;name:string;category:string;group:string;hours:number|null;criteria:string;note:string}
export const workCategories=['Работы с договором','Полевые работы','Камеральные работы'];
export const workGroups=['Доходный договор','Расходный договор','Внутренний проект'];
export function useWorkLibraryPreview(){
 const rows=ref<WorkExample[]>([
  ['101','Техническое задание',8,'ТЗ составлено'],['102','Календарный план',1,'План составлен'],['103','Бюджет',1,'Бюджет составлен'],['106','Итоговый отчёт',20,'Отчёт согласован'],['125','Обработка геодезии',8,'Материалы обработаны'],['126','Обработка фото и видео',8,'Материалы обработаны'],['144','Дополнительное соглашение',8,'Материалы подготовлены'],['201','Техническое задание',8,'ТЗ составлено']
 ].map((a,i)=>({id:i+1,code:String(a[0]),name:String(a[1]),hours:Number(a[2]),criteria:String(a[3]),category:i===4||i===5?'Камеральные работы':'Работы с договором',group:i===7?'Расходный договор':'Доходный договор',note:''})));
 const search=ref(''),category=ref(''),group=ref(''),sortKey=ref<'code'|'name'|'hours'>('code'),descending=ref(false);
 const norm=(s:string)=>s.trim().toLocaleLowerCase('ru-RU');
 const filtered=computed(()=>rows.value.filter(r=>(!category.value||r.category===category.value)&&(!group.value||r.group===group.value)&&norm(Object.values(r).join(' ')).includes(norm(search.value))).sort((a,b)=>{const key=sortKey.value;const n=key==='hours'?(a.hours??-1)-(b.hours??-1):a[key].localeCompare(b[key],'ru',{numeric:true});return descending.value?-n:n}));
 function sort(k:typeof sortKey.value){if(sortKey.value===k)descending.value=!descending.value;else{sortKey.value=k;descending.value=false}}
 function save(value:WorkExample){const name=value.name.trim();if(!name)throw Error('Введите наименование работы.');if(value.hours!==null&&(!Number.isFinite(value.hours)||value.hours<0))throw Error('Трудоёмкость должна быть неотрицательным числом.');
 const existing=rows.value.find(r=>r.id===value.id);const row={...value,name,code:existing?.code??`DEMO-${Math.max(...rows.value.map(r=>r.id),0)+1}`,id:existing?.id??Math.max(...rows.value.map(r=>r.id),0)+1};if(existing)rows.value=rows.value.map(r=>r.id===row.id?row:r);else rows.value.push(row);return row}
 return{rows,search,category,group,filtered,sort,sortKey,descending,save};
}
