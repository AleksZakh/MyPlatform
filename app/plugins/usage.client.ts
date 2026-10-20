import { usagePage, USAGE_CLICKS } from '~~/shared/usage';
export default defineNuxtPlugin(() => {
  const { user, loggedIn } = useUserSession(), router = useRouter();
  let events: { id:string; kind:string; target:string }[] = [], sending = false, generation = 0, currentUser: number | undefined, lastWarning=0;
  function record(kind:string,target:string) { if (loggedIn.value && currentUser && events.length<100) events.push({id:crypto.randomUUID(),kind,target}); }
  function page() { const target=usagePage(router.currentRoute.value.path); if(target)record('PAGE',target); }
  async function flush() {
    if(sending || !events.length || !loggedIn.value)return;
    const version=generation,batch=events.slice(0,25); sending=true;
    try { await $fetch('/api/statistics/events',{method:'POST',headers:{'x-space-work':'1'},body:{events:batch},retry:0,keepalive:true}); if(version===generation)events.splice(0,batch.length); } catch(error:any) { if(Date.now()-lastWarning>60000){lastWarning=Date.now();console.warn('[usage] События пока не приняты сервером',{status:error?.statusCode||error?.status||0});} } finally {sending=false;}
  }
  const stopWatch=watch(()=>loggedIn.value ? user.value?.id : undefined,id=>{generation++;events=[];currentUser=typeof id==='number'?id:undefined;if(currentUser)page();},{immediate:true});
  const denied=useState<{id:string;actorId:number;target:string}|null>('usage-access-denial',()=>null);
  const stopDenied=watch([denied,()=>loggedIn.value ? user.value?.id : undefined],()=>{
    if(!denied.value || !loggedIn.value || !currentUser)return;
    if(denied.value.actorId!==currentUser){denied.value=null;return;}
    const target=usagePage(denied.value.target);if(target)record('ACCESS_DENIED',target);denied.value=null;
  },{immediate:true});
  const stopRouter=router.afterEach((_to,_from,failure)=>{if(!failure)page();});
  const click=(event:Event)=>{const el=(event.target as Element)?.closest?.('[data-space-stat]');const key=el?.getAttribute('data-space-stat');if(key&&Object.hasOwn(USAGE_CLICKS,key))record('CLICK',key);};
  const play=(event:Event)=>{const id=(event.target as HTMLElement)?.dataset?.spaceVideo;if(id&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))record('VIDEO_PLAY',id);};
  const visibility=()=>{if(document.hidden)void flush();};
  document.addEventListener('click',click,true);document.addEventListener('play',play,true);document.addEventListener('visibilitychange',visibility);
  const timer=setInterval(()=>void flush(),15000);
  if(import.meta.hot)import.meta.hot.dispose(()=>{clearInterval(timer);stopWatch();stopDenied();stopRouter();document.removeEventListener('click',click,true);document.removeEventListener('play',play,true);document.removeEventListener('visibilitychange',visibility);});
});
