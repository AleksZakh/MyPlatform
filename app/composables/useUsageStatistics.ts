
import { USAGE_KINDS, USAGE_CLICKS } from '~~/shared/usage';
export function useUsageStatistics() {
const days=ref(7),actorId=ref(''),kind=ref(''),page=ref(1),busy=ref(false),error=ref('');
interface Report {summary:{events:number;users:number;logins:number;denied:number};popular:{kind:string;target:string;targetLabel:string;count:number}[];daily:{day:string;events:number;users:number}[];items:{id:string;actorId:number;actorName:string;recipientName:string|null;kind:string;target:string;targetLabel:string;source:string;occurredAt:string}[];page:number;health:{enabled:boolean;pending:number;dropped:number;lastErrorAt:string|null;retentionDays:number;received:number;saved:number;excluded:number;lastReceivedAt:string|null;lastSavedAt:string|null;lastFlushAt:string|null;lastStoredEventAt:string|null;lastErrorCode:string|null;auditedDenials:number;responseDenials:number}}
const report=ref<Report|null>(null);let seq=0;
function label(key:string){return USAGE_KINDS[key as keyof typeof USAGE_KINDS]||key;}
function target(key:string){return USAGE_CLICKS[key as keyof typeof USAGE_CLICKS]||key;}
function date(value:string){return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(value));}
async function load(reset=false){if(reset)page.value=1;const ticket=++seq;busy.value=true;error.value='';try{const data=await $fetch<Report>('/api/admin/statistics',{query:{days:days.value,actorId:actorId.value||undefined,kind:kind.value||undefined,page:page.value}});if(ticket===seq)report.value=data;}catch(e:any){if(ticket===seq){report.value=null;error.value=e.data?.message||'Статистика недоступна. Проверьте право просмотра и миграцию.';}}finally{if(ticket===seq)busy.value=false;}}
let timer:ReturnType<typeof setInterval>|undefined;
onMounted(()=>{void load();timer=setInterval(()=>{if(!busy.value&&!document.hidden)void load();},15000);});
onBeforeUnmount(()=>{seq++;if(timer)clearInterval(timer);});
function resetFilters(){days.value=7;actorId.value='';kind.value='';void load(true);}

return { days, actorId, kind, page, busy, error, report, label, date, load, resetFilters };
}
