import type {H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {findDomainUser,normalizeDomainLogin} from '../ad-directory.service';
export type PlansRegionalCenter={regionalCenter:string;regionalCenterSource:'database'|'ad'|'missing'|'unavailable'};
const cache=new Map<string,{until:number;value:PlansRegionalCenter}>();
const inflight=new Map<string,Promise<PlansRegionalCenter>>();let active=0;
const absent=(source:'missing'|'unavailable'='missing'):PlansRegionalCenter=>({regionalCenter:'',regionalCenterSource:source});
/** Point lookups only; no directory dump, no LDAP inside a database transaction. */
export async function plansRegionalCenters(event:H3Event,ids:number[],stopped:()=>boolean=()=>false){
 const result=new Map<number,PlansRegionalCenter>(),unique=[...new Set(ids)].slice(0,200);if(!unique.length||stopped())return result;
 const users=await prisma.user.findMany({where:{id:{in:unique},deletedAt:null},take:200,select:{id:true,login:true,authType:true,directoryObjectId:true,department:{select:{name:true}}}});
 const missing:typeof users=[];
 for(const u of users){const local=u.department?.name?.trim();if(local)result.set(u.id,{regionalCenter:local,regionalCenterSource:'database'});else if(u.authType==='DOMAIN'&&u.login)missing.push(u);else result.set(u.id,absent());}
 const deadline=Date.now()+8000;let next=0;
 const worker=async()=>{while(next<missing.length){const u=missing[next++]!;if(stopped()||Date.now()>=deadline){result.set(u.id,absent('unavailable'));continue;}
  const key=JSON.stringify([u.directoryObjectId?.toLowerCase()||'',normalizeDomainLogin(u.login||'')]);
  const stored=cache.get(key);if(stored&&stored.until>Date.now()){result.set(u.id,stored.value);continue;}
  while(active>=2&&!inflight.has(key)&&Date.now()<deadline&&!stopped())await new Promise(r=>setTimeout(r,50));
  if(Date.now()>=deadline||stopped()){result.set(u.id,absent('unavailable'));continue;}
  let pending=inflight.get(key);
  if(!pending){active++;pending=(async()=>{try{const profile=await findDomainUser(u.login!,event);
    if(!profile)return absent();
    const same=u.directoryObjectId?profile.directoryObjectId?.toLowerCase()===u.directoryObjectId.toLowerCase():normalizeDomainLogin(profile.login)===normalizeDomainLogin(u.login!);
    if(!same)return absent('unavailable');const name=profile.department?.trim();return name?{regionalCenter:name,regionalCenterSource:'ad' as const}:absent();
   }catch{return absent('unavailable');}finally{active--;}})();
   inflight.set(key,pending);void pending.then(value=>{inflight.delete(key);if(cache.size>=1000)cache.delete(cache.keys().next().value!);cache.set(key,{until:Date.now()+(value.regionalCenterSource==='unavailable'?30000:300000),value});});
  }
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{result.set(u.id,await Promise.race([pending,new Promise<PlansRegionalCenter>(resolve=>{timer=setTimeout(()=>resolve(absent('unavailable')),Math.max(0,deadline-Date.now()));})]));}finally{clearTimeout(timer);}
 }};
 await Promise.all([worker(),worker()]);return result;
}
