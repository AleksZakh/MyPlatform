import {Prisma} from '@prisma/client';
import {contractAccess} from '../../../services/diagnostic/access';
import {prisma} from '../../../utils/prisma';
export default defineEventHandler(async event=>{
 await contractAccess(event,'VIEW');const q=getQuery(event);
 const text=(x:unknown)=>typeof x==='string'?x.trim().slice(0,255):'';
 const search=text(q.search),road=text(q.road),page=Math.max(1,Math.min(10000,Number(q.page)||1));
 const km=(x:unknown)=>{const s=text(x);if(!s)return undefined;if(!/^\d{1,6}(?:[.,]\d{1,3}|\+\d{1,3})?$/.test(s))throw createError({statusCode:400,message:'Интервал: число км или км+м.'});return s.includes('+')?Number(s.split('+')[0])*1000+Number(s.split('+')[1]):Math.round(Number(s.replace(',','.'))*1000);};
 const from=km(q.from),to=km(q.to);if(from!=null&&to!=null&&from>to)throw createError({statusCode:400,message:'Начало интервала больше окончания.'});
 const where:Prisma.DiagnosticStructureWhereInput={deletedAt:null,...(road?{roadName:road}:{}),...(search?{OR:['code','structureName','roadName','location'].map(k=>({[k]:{contains:search,mode:'insensitive'}}))}:{}),...((from!=null||to!=null)?{locationMetres:{gte:from,lte:to}}:{})};
 const [rows,total,roads]=await prisma.$transaction([prisma.diagnosticStructure.findMany({where,orderBy:[{roadName:'asc'},{locationMetres:'asc'},{id:'asc'}],skip:(Math.floor(page)-1)*100,take:100,select:{id:true,code:true,structureName:true,roadName:true,location:true,additionalId:true,region:true,locationMetres:true}}),prisma.diagnosticStructure.count({where}),prisma.diagnosticStructure.findMany({where:{deletedAt:null},distinct:['roadName'],select:{roadName:true},orderBy:{roadName:'asc'}})]);
 return {items:rows.map(r=>({...r,locationMetres:r.locationMetres==null?null:Number(r.locationMetres)})),total,page:Math.floor(page),roads:roads.map(r=>r.roadName).filter(Boolean)};
});
