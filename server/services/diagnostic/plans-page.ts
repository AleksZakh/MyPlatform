import {createError} from 'h3';
import {createHash} from 'node:crypto';
import {calendarName} from '../../../shared/utils/diagnostic-calendar';
import {tripDay} from '../../../shared/utils/diagnostic-trips';
import type {CalendarRow,CalendarUser} from '../../../shared/types/diagnostic-calendar';
export const PLAN_BATCH=250,PLAN_PAGE=200;
type Position=Pick<CalendarRow,'key'|'planStart'>;
export function planCompare(a:Position,b:Position){if(a.planStart===null&&b.planStart!==null)return 1;if(b.planStart===null&&a.planStart!==null)return -1;return String(b.planStart??'').localeCompare(String(a.planStart??''))||a.key.localeCompare(b.key);}
export const planContext=(user:number,selection:string,search:string)=>createHash('sha256').update(JSON.stringify([user,selection,search])).digest('hex').slice(0,24);
export function readPlanCursor(value:unknown,context:string):Position|null{
 if(value===undefined)return null;
 try{if(typeof value!=='string'||value.length>512||!/^[A-Za-z0-9_-]+$/.test(value))throw Error();const v=JSON.parse(Buffer.from(value,'base64url').toString('utf8'));if(v.v!==1||v.context!==context||typeof v.key!=='string'||v.key.length>90||!/^(contract|structure|trip):[1-9]\d*:[1-9]\d*$/.test(v.key)||v.planStart!==null&&!tripDay(v.planStart))throw Error();return {key:v.key,planStart:v.planStart};}catch{throw createError({statusCode:400,message:'Страница устарела. Нажмите «Обновить».'});}
}
export const writePlanCursor=(p:Position,context:string)=>Buffer.from(JSON.stringify({v:1,context,key:p.key,planStart:p.planStart})).toString('base64url');
/** Max heap: retains at most page size + 1 rows, irrespective of the source size/page number. */
export class PlanPageCollector {
 private heap:CalendarRow[]=[];total=0;
 constructor(private after:Position|null,private limit=PLAN_PAGE+1){}
 get retained(){return this.heap.length;}
 add(row:CalendarRow){this.total++;if(this.after&&planCompare(row,this.after)<=0)return;
  if(this.heap.length<this.limit){this.heap.push(row);let i=this.heap.length-1;while(i>0){const p=(i-1)>>1;if(planCompare(this.heap[p]!,this.heap[i]!)>=0)break;[this.heap[p],this.heap[i]]=[this.heap[i]!,this.heap[p]!];i=p;}return;}
  if(planCompare(row,this.heap[0]!)>=0)return;this.heap[0]=row;let i=0;for(;;){const a=i*2+1,b=a+1;if(a>=this.heap.length)break;const j=b<this.heap.length&&planCompare(this.heap[b]!,this.heap[a]!)>0?b:a;if(planCompare(this.heap[i]!,this.heap[j]!)>=0)break;[this.heap[i],this.heap[j]]=[this.heap[j]!,this.heap[i]!];i=j;}
 }
 finish(){const ordered=this.heap.sort(planCompare);return {rows:ordered.slice(0,this.limit-1),hasMore:ordered.length===this.limit,total:this.total};}
}
/** Conservative surname/login prefilter; full/initial ambiguity is still checked in JS. */
export function planEmployeeFilter(user:CalendarUser|null){
 if(!user)return {};
 const terms=new Set<string>();const seeds=[user.name.trim().split(/\s+/)[0]||'',user.login||''];
 for(const seed of seeds){if(!seed)continue;let variants=[''];for(const c of calendarName(seed)){variants=variants.flatMap(s=>c==='е'||c==='ё'?[s+'е',s+'ё']:[s+c]);if(variants.length>64)return {}; }for(const v of variants)terms.add(v);terms.add(seed);}
 if(!terms.size)return {};
 // Compatibility Unicode may have spellings not representable by this coarse SQL filter.
 if(seeds.some(s=>s.normalize('NFKC')!==s))return {};
 return {OR:[...terms].flatMap(term=>[{planExecutor:{contains:term,mode:'insensitive' as const}},{factExecutor:{contains:term,mode:'insensitive' as const}}])};
}
