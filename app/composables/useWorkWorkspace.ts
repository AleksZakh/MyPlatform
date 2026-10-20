import type { WorkContext,WorkProjectDTO,WorkTaskDTO } from '~~/shared/types/work';
import { portalToday } from '~~/shared/utils/work-board';
export function useWorkWorkspace() {
 const route=useRoute();const context=ref<WorkContext|null>(null),projects=ref<WorkProjectDTO[]>([]),project=ref<WorkProjectDTO|null>(null),tasks=ref<WorkTaskDTO[]>([]);
 const tab=ref<'mine'|'department'|'projects'>('mine'),view=ref<'time'|'status'|'list'|'timeline'|'members'|'files'>('time');
 const selectedDepartment=ref<number|null>(null),archived=ref(false),completed=ref(false),search=ref(''),today=ref(portalToday()),loading=ref(false),error=ref('');
 const taskTotal=ref(0),taskPage=ref(1),projectTotal=ref(0),projectPage=ref(1);const {error:saveError,saving,send}=useWorkApi();let timer:ReturnType<typeof setInterval>|undefined;let debounce:ReturnType<typeof setTimeout>|undefined;let sequence=0;
 const contextLabel=computed(()=>context.value?.departments.find(d=>d.id===selectedDepartment.value)?.name||'Все подразделения');
 function routeDepartment(){const key=String(route.params.department||'');const aliases:Record<string,string[]>={lab:['lab','laboratory-control','labcontrol'],diagnostic:['diagnostic','diagnostics']};
 const found=context.value?.departments.find(d=>(aliases[key]||[key]).includes(d.key));selectedDepartment.value=found?.id||context.value?.department?.id||null;}
 async function loadProjects(more=false){const page=more?projectPage.value+1:1;const r=await $fetch<{items:WorkProjectDTO[];total:number}>('/api/work/projects',{query:{page,archived:archived.value?'1':'0'}});projects.value=more?[...projects.value,...r.items]:r.items;projectTotal.value=r.total;projectPage.value=page;}
 async function loadTasks(more=false){const ticket=++sequence;loading.value=true;error.value='';const page=more?taskPage.value+1:1;
 const query={page,order:view.value==='timeline'?'timeline':'schedule',completed:completed.value?'1':'0',q:search.value,...(project.value?{projectId:project.value.id}:tab.value==='department'&&selectedDepartment.value?{departmentId:selectedDepartment.value}:{})};
 if(tab.value==='department'&&!selectedDepartment.value){tasks.value=[];taskTotal.value=0;loading.value=false;return;}
 try{const r=await $fetch<{items:WorkTaskDTO[];total:number}>('/api/work/tasks',{query});if(ticket!==sequence)return;tasks.value=more?[...tasks.value,...r.items]:r.items;taskTotal.value=r.total;taskPage.value=page;}
 catch(e:any){if(ticket===sequence){error.value=e.data?.message||'Не удалось загрузить задачи.';tasks.value=[];}}
 finally{if(ticket===sequence)loading.value=false;}}
 async function reload(){error.value='';try{await loadProjects();if(project.value){project.value=await $fetch<WorkProjectDTO>('/api/work/projects/'+project.value.id);if(!projects.value.some(p=>p.id===project.value?.id))projects.value.push(project.value);}await loadTasks();}catch(e:any){error.value=e.data?.message||'Не удалось загрузить проекты.';}}
 async function initialize(){loading.value=true;error.value='';try{context.value=await $fetch<WorkContext>('/api/work/context');routeDepartment();await reload();}catch(e:any){error.value=e.data?.message||'Не удалось открыть раздел. Проверьте миграцию и соединение.';}finally{loading.value=false;}}
 async function openProject(p:WorkProjectDTO){project.value=p;tab.value='projects';view.value='status';search.value='';await loadTasks();}
 async function selectTab(t:typeof tab.value){sequence++;project.value=null;tab.value=t;view.value='time';search.value='';tasks.value=[];await loadTasks();}
 async function move(t:WorkTaskDTO,patch:Record<string,unknown>){const result=await send<WorkTaskDTO>('/api/work/tasks/'+t.id,'PATCH',{version:t.version,...patch});if(result)await loadTasks();}
 async function toggleArchive(){if(!project.value)return;const r=await send<WorkProjectDTO>('/api/work/projects/'+project.value.id+'/archive','POST',{version:project.value.version,archived:!project.value.archivedAt});if(r){project.value=r;await reload();}}
 watch(()=>view.value==='timeline',()=>{if(context.value){tasks.value=[];void loadTasks();}});
 watch([completed,selectedDepartment],()=>{if(context.value)loadTasks();});watch(search,()=>{clearTimeout(debounce);debounce=setTimeout(()=>loadTasks(),300);});
 watch(archived,()=>{if(context.value)loadProjects().catch(()=>{error.value='Не удалось загрузить проекты.';});});
 watch(()=>route.params.department,()=>{if(context.value){routeDepartment();selectTab('mine');}});
 onMounted(()=>{initialize();timer=setInterval(()=>{today.value=portalToday();},60000);});
 onBeforeUnmount(()=>{sequence++;clearInterval(timer);clearTimeout(debounce);});
 return {context,projects,project,tasks,tab,view,selectedDepartment,archived,completed,search,today,loading,error,saveError,saving,taskTotal,projectTotal,contextLabel,loadProjects,loadTasks,reload,initialize,openProject,selectTab,move,toggleArchive};
}
