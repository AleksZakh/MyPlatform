import { isStatisticsOwner, statisticsOwnerWhere } from '../../../services/usage-owner';
import { Prisma } from '@prisma/client';
import { defineEventHandler, getQuery, createError, setHeader } from 'h3';
import { prisma } from '../../../utils/prisma';
import { getAccessActor } from '../../../services/access-control.service';
import { usageHealth } from '../../../services/usage';
import { USAGE_KINDS, usageTargetLabel } from '../../../../shared/usage';
export default defineEventHandler(async event => {
  if(event.context.externalSessionRevoked)throw createError({statusCode:401});
  const actor=await getAccessActor(event);
  if(!isStatisticsOwner(actor.user))throw createError({statusCode:403,message:'Статистика доступна только владельцу.'});
  const excludedIds=(await prisma.user.findMany({where:statisticsOwnerWhere,select:{id:true}})).map(u=>u.id);
  if(!excludedIds.includes(actor.user.id))excludedIds.push(actor.user.id);
  setHeader(event,'Cache-Control','private, no-store');
  const q=getQuery(event), days=Number(q.days || 7), actorId=q.actorId?Number(q.actorId):null, page=Number(q.page||1);
  if(![1,7,30,90].includes(days)||!Number.isInteger(page)||page<1||page>10000||(actorId!==null&&(!Number.isInteger(actorId)||actorId<1||actorId>2147483647)))throw createError({statusCode:400});
  const kind=String(q.kind||'');if(kind&&!Object.hasOwn(USAGE_KINDS, kind))throw createError({statusCode:400});
  const since=new Date(Date.now()-days*86400000), where={AND:[{actorId:{notIn:excludedIds}}],occurredAt:{gte:since},...(actorId?{actorId}:{}),...(kind?{kind}:{})};
  const sql=Prisma.sql`"occurredAt" >= ${since} AND "actorId" NOT IN (${Prisma.join(excludedIds)}) ${actorId?Prisma.sql`AND "actorId"=${actorId}`:Prisma.empty} ${kind?Prisma.sql`AND kind=${kind}`:Prisma.empty}`;
  const summary=await prisma.$queryRaw<{events:bigint;users:bigint;logins:bigint}[]>`SELECT count(*) as events,count(DISTINCT "actorId") as users,count(*) FILTER (WHERE kind='LOGIN') as logins FROM usage_events WHERE ${sql}`;
  const popular=await prisma.usageEvent.groupBy({by:['kind','target'],where,_count:{_all:true},orderBy:{_count:{target:'desc'}},take:15});
  const daily=await prisma.$queryRaw<{day:string;events:bigint;users:bigint}[]>`SELECT to_char("occurredAt" + interval '3 hours','DD.MM.YYYY') AS day,count(*) AS events,count(DISTINCT "actorId") AS users FROM usage_events WHERE ${sql} GROUP BY date("occurredAt" + interval '3 hours'),to_char("occurredAt" + interval '3 hours','DD.MM.YYYY') ORDER BY date("occurredAt" + interval '3 hours')`;
  const latest=await prisma.usageEvent.findFirst({where:{actorId:{notIn:excludedIds}},orderBy:{occurredAt:'desc'},select:{occurredAt:true}});
  const rows=await prisma.usageEvent.findMany({where,orderBy:[{occurredAt:'desc'},{id:'desc'}],skip:(page-1)*50,take:50});
  const ids=[...new Set(rows.flatMap(r=>[r.actorId,...(r.recipientId?[r.recipientId]:[])]))];
  const users=await prisma.user.findMany({where:{id:{in:ids}},select:{id:true,fullName:true,login:true}}),names=new Map(users.map(u=>[u.id,u.fullName||u.login||`Сотрудник #${u.id}`]));
  const targets=[...new Set([...rows.map(r=>r.target),...popular.map(p=>p.target)])];
  const assetIds=targets.flatMap(t=>/^\/api\/library\/assets\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(t)?[t.split('/').at(-1)!]:[]);
  const videoIds=targets.flatMap(t=>/^\/api\/library\/videos\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(t)?[t.split('/').at(-1)!]:/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(t)?[t]:[]);
  const labels=new Map<string,string>();
  if(assetIds.length){const books=await prisma.libraryBook.findMany({where:{pdfId:{in:assetIds},deletedAt:null},select:{pdfId:true,title:true},take:100});for(const b of books)labels.set('/api/library/assets/'+b.pdfId,b.title);}
  if(videoIds.length){const videos=await prisma.libraryVideo.findMany({where:{id:{in:videoIds},deletedAt:null},select:{id:true,title:true},take:100});for(const v of videos){labels.set('/api/library/videos/'+v.id,v.title);labels.set(v.id,v.title);}}
  const targetLabel=(target:string)=>labels.get(target)||usageTargetLabel(target);
  const totals=summary[0]!;
  return {summary:{events:Number(totals.events),users:Number(totals.users),logins:Number(totals.logins)},popular:popular.map(p=>({kind:p.kind,target:p.target,targetLabel:targetLabel(p.target),count:p._count._all})),daily:daily.map(d=>({day:d.day,events:Number(d.events),users:Number(d.users)})),items:rows.map(r=>({...r,targetLabel:targetLabel(r.target),actorName:names.get(r.actorId)||`Сотрудник #${r.actorId}`,recipientName:r.recipientId?names.get(r.recipientId)||`Сотрудник #${r.recipientId}`:null})),page,health:{...usageHealth(),lastStoredEventAt:latest?.occurredAt||null,excludedLogin:'zakharov_av'}};
});
