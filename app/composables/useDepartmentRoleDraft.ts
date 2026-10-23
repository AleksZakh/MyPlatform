import {computed, onMounted, onBeforeUnmount, ref, watch} from 'vue';
import {newDraft,newScope,parseDraft,cloneAssignment,effectiveRights,setTemplate,type RolePreviewCatalog,type Role,type Capability,type Assignment} from '~~/shared/access/department-role-draft';

export function useDepartmentRoleDraft() {
 const catalog=ref<RolePreviewCatalog|null>(null),loading=ref(true),error=ref(''),notice=ref('');
 const draft=ref(newDraft()),saved=ref(''),scopeKey=ref('lab');
 const selected=ref<number[]>([]),search=ref(''),groupFilter=ref(''),roleFilter=ref(''),focusUser=ref<number|null>(null);
 const role=ref<Role>('observer'),copyFrom=ref('');
 const scope=computed(()=>draft.value.scopes[scopeKey.value]!);
 const dirty=computed(()=>!!catalog.value && JSON.stringify(draft.value)!==saved.value);
 const storageKey=()=>`space.department-role-preview.v1.${catalog.value!.actorId}`;
 const currentGroup=computed(()=>catalog.value?.groups.find(g=>groupFilter.value===`group:${g.id}`));
 const filtered=computed(()=> (catalog.value?.users||[]).filter(u=>{
  const filter=groupFilter.value;
  if(filter.startsWith('group:') && !currentGroup.value?.userIds.includes(u.id))return false;
  if(filter.startsWith('department:') && String(u.departmentId)!==filter.slice(11))return false;
  const assigned=scope.value?.assignments[u.id];
  if(roleFilter.value==='none' && assigned)return false;
  if(roleFilter.value && roleFilter.value!=='none' && assigned?.role!==roleFilter.value)return false;
  return `${u.name} ${u.login} ${u.department||''}`.toLocaleLowerCase('ru').includes(search.value.trim().toLocaleLowerCase('ru'));
 }));
 const focused=computed(()=>catalog.value?.users.find(u=>u.id===focusUser.value));
 const assignment=computed(()=>focusUser.value===null?undefined:scope.value?.assignments[focusUser.value]);
 const selectedUsers=computed(()=>catalog.value?.users.filter(u=>selected.value.includes(u.id))||[]);
 const allSelected=computed(()=>filtered.value.length>0 && filtered.value.every(u=>selected.value.includes(u.id)));
 const rights=(id:number)=>effectiveRights(scope.value,scope.value.assignments[id]);
 function assign(id:number,value:Role|'') {
  if(value)scope.value.assignments[id]={role:value,overrides:{}};
  else delete scope.value.assignments[id];
  notice.value='';
 }
 function bulkAssign(){for(const id of selected.value)assign(id,role.value);notice.value=`В черновике назначена роль: ${selected.value.length} сотрудникам. Персональные исключения сброшены.`;}
 function copy(){const source=scope.value.assignments[copyFrom.value];if(!source)return;for(const id of selected.value)scope.value.assignments[id]=cloneAssignment(source);notice.value=`Шаблон сотрудника скопирован в черновике: ${selected.value.length}.`;}
 function toggle(id:number){selected.value=selected.value.includes(id)?selected.value.filter(x=>x!==id):[...selected.value,id];}
 function toggleAll(){selected.value=allSelected.value?[]:filtered.value.map(u=>u.id);}
 function override(cap:Capability,value:string){const a=assignment.value;if(!a)return;if(value==='inherit')delete a.overrides[cap];else a.overrides[cap]=value==='allow';notice.value='';}
 function template(cap:Capability,value:boolean){setTemplate(scope.value,role.value,cap,value);notice.value='';}
 function save(){try{const raw=JSON.stringify(draft.value);localStorage.setItem(storageKey(),raw);saved.value=raw;notice.value='Черновик сохранён в этом браузере. Рабочие права не изменены.';}catch{notice.value='Не удалось сохранить черновик в браузере. Выгрузите его в JSON.';}}
 function reset(){if(!window.confirm('Сбросить тестовые роли и назначения выбранного подразделения? Рабочие права не изменятся.'))return;draft.value.scopes[scopeKey.value]=newScope();notice.value='Подразделение сброшено в черновике. Для сохранения нажмите «Сохранить черновик».';}
 function exportDraft(){const blob=new Blob([JSON.stringify({kind:'space-department-role-preview',appliesToProduction:false,exportedAt:new Date().toISOString(),...draft.value},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='space-department-role-preview.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function load(){
  loading.value=true;error.value='';
  try{
   const result=await $fetch<RolePreviewCatalog>('/api/admin/access/role-preview');catalog.value=result;
   let parsed=newDraft();
   try{const raw=localStorage.getItem(storageKey());if(raw)parsed=parseDraft(raw);}catch{notice.value='Сохранённый черновик недоступен или повреждён. Загружены базовые шаблоны; прежнее содержимое не перезаписано.';}
   for(const s of result.scopes)parsed.scopes[s.key]??=newScope();
   draft.value=parsed;saved.value=JSON.stringify(parsed);
  }catch{catalog.value=null;error.value='Не удалось загрузить данные. Страница доступна только администратору Space. Проверьте подключение и права.';}
  finally{loading.value=false;}
 }
 watch([scopeKey,search,groupFilter,roleFilter],()=>{selected.value=[];focusUser.value=null;copyFrom.value='';});
 function unload(event:BeforeUnloadEvent){if(dirty.value){event.preventDefault();event.returnValue='';}}
 onMounted(()=>{void load();window.addEventListener('beforeunload',unload);});
 onBeforeUnmount(()=>window.removeEventListener('beforeunload',unload));
 return {catalog,loading,error,notice,draft,scopeKey,scope,dirty,selected,search,groupFilter,roleFilter,focusUser,role,copyFrom,currentGroup,filtered,focused,assignment,selectedUsers,allSelected,rights,assign,bulkAssign,copy,toggle,toggleAll,override,template,save,reset,exportDraft,load};
}
