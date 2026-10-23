import {ref,computed,watch,onMounted,onBeforeUnmount} from 'vue';
import {liveRoles,liveCapabilities,type DepartmentScope,type ScopeRights,type ScopedSnapshot,type ScopeRequest,type ScopePlan} from '~~/shared/access/live-policy';
import type {AccessSubjectKind,AccessSubjectOption,AccessActionName} from '~~/shared/types/access-management';
export function useLiveDepartmentAccess(){
 const route=useRoute();const router=useRouter();
 const scope=ref<DepartmentScope|'other'>('lab'),kind=ref<AccessSubjectKind>(['user','department','domainGroup','spaceGroup'].includes(String(route.query.kind))?route.query.kind as AccessSubjectKind:'spaceGroup');
 const metadata=ref<{scopes:{key:DepartmentScope;name:string}[];isSystemAdmin:boolean}|null>(null);
 const subjects=ref<AccessSubjectOption[]>([]),selected=ref<number[]>([]),snapshots=ref<ScopedSnapshot[]>([]),search=ref(''),hasMore=ref(false);
 const loading=ref(false),reading=ref(false),busy=ref(false),error=ref(''),notice=ref('');
 const rights=ref<ScopeRights>({...liveRoles[0]!.rights}),denialMode=ref<'keep'|'replace'>('keep'),denied=ref<AccessActionName[]>([]);
 const plan=ref<ScopePlan|null>(null),plannedInput=ref<ScopeRequest|null>(null);
 const role=computed(()=>liveRoles.find(r=>liveCapabilities.every(c=>r.rights[c.key]===rights.value[c.key]))?.key||'custom');
 let sequence=0,readSequence=0,timer:ReturnType<typeof setTimeout>|undefined,disposed=false;
 const headers={'x-space-access-change':'1'};
 const message=(e:any)=>e?.data?.data?.message||e?.data?.message||'Не удалось выполнить операцию. Обновите данные и повторите.';
 function invalidate(){plan.value=null;plannedInput.value=null;}
 async function load(){
  const token=++sequence;loading.value=true;error.value='';subjects.value=[];selected.value=[];
  try{const r=await $fetch<{items:AccessSubjectOption[];hasMore:boolean}>('/api/admin/access/subjects',{query:{kind:kind.value,search:search.value,...(scope.value==='other'?{}:{scope:scope.value})}});if(token!==sequence||disposed)return;subjects.value=r.items;hasMore.value=r.hasMore;}
  catch(e){if(token===sequence&&!disposed)error.value=message(e);}finally{if(token===sequence&&!disposed)loading.value=false;}
 }
 async function read(){
  const token=++readSequence;invalidate();snapshots.value=[];error.value='';reading.value=true;
  const currentScope=scope.value,currentKind=kind.value,ids=[...selected.value];
  try{if(currentScope!=='other')for(const id of ids){const s=await $fetch<ScopedSnapshot>('/api/admin/access/department',{query:{scope:currentScope,kind:currentKind,id}});if(token!==readSequence||disposed)return;snapshots.value.push(s);}}
  catch(e){if(token===readSequence&&!disposed){error.value=message(e);snapshots.value=[];}}
  finally{if(token===readSequence&&!disposed)reading.value=false;}
 }
 function toggle(id:number){if(busy.value)return;if(selected.value.includes(id))selected.value=selected.value.filter(i=>i!==id);else if(scope.value==='other')selected.value=[id];else if(selected.value.length<10)selected.value=[...selected.value,id];else error.value='Для одной операции выберите не более 10 получателей.';}
 function setRole(key:string){const r=liveRoles.find(r=>r.key===key);if(r)rights.value={...r.rights};}
 function setRight(key:keyof ScopeRights,value:boolean){rights.value[key]=value;if(!value&&key==='view')for(const c of liveCapabilities)rights.value[c.key]=false;else if(value)rights.value.view=true;if(key==='restore'&&value)rights.value.delete=true;if(key==='delete'&&!value)rights.value.restore=false;}
 async function preview(){
  if(scope.value==='other'||reading.value||!selected.value.length)return;
  busy.value=true;error.value='';notice.value='';invalidate();
  const input:ScopeRequest={scope:scope.value,kind:kind.value,ids:[...selected.value],rights:{...rights.value},denied:kind.value==='user'&&denialMode.value==='replace'?[...denied.value]:null};
  try{const result=await $fetch<ScopePlan>('/api/admin/access/department-plan',{method:'POST',headers,body:input});plan.value=result;plannedInput.value=input;}catch(e){error.value=message(e);}finally{busy.value=false;}
 }
 async function apply(){
  if(!plan.value||!plannedInput.value||busy.value)return;
  busy.value=true;error.value='';
  try{await $fetch('/api/admin/access/department-apply',{method:'POST',headers,body:{...plannedInput.value,revisions:Object.fromEntries(plan.value.subjects.map(s=>[s.id,s.revision]))}});invalidate();notice.value='Права сохранены в БД. Все изменения записаны в журнал событий.';await read();}
  catch(e){error.value=message(e);invalidate();}finally{busy.value=false;}
 }
 async function init(){loading.value=true;try{metadata.value=await $fetch<{scopes:{key:DepartmentScope;name:string}[];isSystemAdmin:boolean}>('/api/admin/access/departments');if(!metadata.value?.scopes.length&&!metadata.value?.isSystemAdmin){error.value='Нет полномочий для управления доступом подразделений.';return;}scope.value=metadata.value!.scopes[0]?.key||'other';await load();}catch(e){error.value=message(e);}finally{loading.value=false;}}
 watch([scope,kind],()=>{if(!metadata.value)return;clearTimeout(timer);sequence++;readSequence++;snapshots.value=[];selected.value=[];invalidate();denialMode.value='keep';void load();});
 watch(search,()=>{sequence++;readSequence++;selected.value=[];snapshots.value=[];invalidate();clearTimeout(timer);timer=setTimeout(load,250);});
 watch(selected,()=>{void read();});
 watch([rights,denialMode,denied],invalidate,{deep:true});
 watch(kind,v=>{if(route.query.kind!==v)void router.replace({query:{...route.query,kind:v}});});
 watch(()=>route.query.kind,v=>{if(['user','department','domainGroup','spaceGroup'].includes(String(v)))kind.value=v as AccessSubjectKind;});
 onMounted(init);onBeforeUnmount(()=>{disposed=true;sequence++;readSequence++;clearTimeout(timer);});
 return {scope,kind,metadata,subjects,selected,snapshots,search,hasMore,loading,reading,busy,error,notice,rights,role,denialMode,denied,plan,plannedInput,load,read,toggle,setRole,setRight,preview,apply,init};
}
