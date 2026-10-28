import type {Prisma} from '@prisma/client';
import {createError} from 'h3';
import {prisma} from '../../utils/prisma';
import {structureLocationMetres} from '../../../shared/utils/diagnostic-structures';
import type {StructureQuery,StructureListResponse,StructureCatalog,StructureDetail} from '../../../shared/types/diagnostic-structures-api';
const contains=(value:string)=>({contains:value.replace(/[\\%_]/g,'\\$&'),mode:'insensitive' as const});
export function structureWhere(input:StructureQuery):Prisma.DiagnosticStructureWhereInput {
  const f=input.filters,AND:Prisma.DiagnosticStructureWhereInput[]=[];
  if(f.road)AND.push({roadName:f.road});
  if(f.code)AND.push({code:contains(f.code)});
  if(f.kind)AND.push({structureName:f.kind});
  if(f.issoType)AND.push({issoType:f.issoType});
  if(f.management.length)AND.push({management:{in:f.management}});
  if(f.regions.length)AND.push({region:{in:f.regions}});
  if(f.withWorks)AND.push({plannedWorks:{not:''}});
  const from=structureLocationMetres(f.locationFrom),to=structureLocationMetres(f.locationTo);
  if(from!==null||to!==null)AND.push({locationMetres:{...(from!==null?{gte:from}:{}),...(to!==null?{lte:to}:{})}});
  for(const token of f.search.split(/\s+/).filter(Boolean)){
    const value=contains(token);
    AND.push({OR:[...(['code','roadName','structureName','issoType','location','additionalId','management','region','district','obstacleName','obstacleType','placementType','plannedWorks','note','operator','expertOpinion','conditionRating'] as const).map(key=>({[key]:value})),
      {legacyContracts:{some:{OR:[{number:value},{customer:value}]}}},{legacyExecutors:{some:{name:value}}}]});
  }
  return {deletedAt:null,...(AND.length?{AND}:{})};
}
export function structureOrder(input:StructureQuery):Prisma.DiagnosticStructureOrderByWithRelationInput[]{
  const direction=input.descending?'desc':'asc';
  const primary:Prisma.DiagnosticStructureOrderByWithRelationInput=input.sortKey==='location'?{locationMetres:{sort:direction,nulls:'last'}}:
    {[input.sortKey==='issoCode'?'code':input.sortKey]:direction};
  return [primary,{code:'asc'},{id:'asc'}];
}
const listSelect={id:true,code:true,roadName:true,structureName:true,issoType:true,additionalId:true,location:true,region:true,management:true} satisfies Prisma.DiagnosticStructureSelect;
export async function listStructures(input:StructureQuery):Promise<StructureListResponse>{
  const where=structureWhere(input);
  const [matched,total]=await Promise.all([prisma.diagnosticStructure.count({where}),prisma.diagnosticStructure.count({where:{deletedAt:null}})]);
  const pageCount=Math.max(1,Math.ceil(matched/input.pageSize)),page=Math.min(input.page,pageCount);
  const rows=await prisma.diagnosticStructure.findMany({where,select:listSelect,orderBy:structureOrder(input),skip:(page-1)*input.pageSize,take:input.pageSize});
  return {items:rows.map(({id,code,...row})=>({...row,id:String(id),issoCode:code})),matched,total,page,pageSize:input.pageSize,pageCount};
}
export async function structureCatalog():Promise<StructureCatalog>{
  const where={deletedAt:null};
  const [roads,management,regions,kinds,types]=await Promise.all([
    prisma.diagnosticStructure.groupBy({by:['roadName'],where,orderBy:{roadName:'asc'}}),
    prisma.diagnosticStructure.groupBy({by:['management'],where,orderBy:{management:'asc'}}),
    prisma.diagnosticStructure.groupBy({by:['region'],where,orderBy:{region:'asc'}}),
    prisma.diagnosticStructure.groupBy({by:['structureName'],where,orderBy:{structureName:'asc'}}),
    prisma.diagnosticStructure.groupBy({by:['issoType'],where,orderBy:{issoType:'asc'}}),
  ]);
  return {roads:roads.map(r=>r.roadName).filter(Boolean),management:management.map(r=>r.management).filter(Boolean),regions:regions.map(r=>r.region).filter(Boolean),kinds:kinds.map(r=>r.structureName).filter(Boolean),types:types.map(r=>r.issoType).filter(Boolean)};
}
export async function structureCodes(){return (await prisma.diagnosticStructure.findMany({where:{deletedAt:null},select:{code:true},orderBy:{code:'asc'}})).map(r=>r.code);}
export async function readStructure(id:number):Promise<StructureDetail>{
  const row=await prisma.diagnosticStructure.findFirst({where:{id,deletedAt:null},include:{
    legacyRows:{select:{legacyId:true,importedAt:true,importedById:true},orderBy:{legacyId:'asc'}},
    legacyContracts:{select:{customer:true,number:true,dateText:true},orderBy:[{date:'asc'},{id:'asc'}]},
    legacyExecutors:{select:{name:true},orderBy:{name:'asc'}},
  }});
  if(!row)throw createError({statusCode:404,message:'Сооружение не найдено или удалено.'});
  const authors=await prisma.user.findMany({where:{id:{in:[...new Set([row.createdById,row.updatedById,...row.legacyRows.map(r=>r.importedById)])]}},select:{id:true,fullName:true,login:true,deletedAt:true}});
  const names=new Map(authors.map(u=>[u.id,u.deletedAt?'Удалённый аккаунт':u.fullName||u.login||('Сотрудник #'+u.id)]));
  return {id:String(row.id),issoCode:row.code,sourceFile:row.legacyRows.length?'dis_build':'Space',sourceRow:0,sourceOrdinal:'',
    management:row.management,structureName:row.structureName,issoType:row.issoType,additionalId:row.additionalId,
    roadName:row.roadName,location:row.location,placementType:row.placementType,obstacleType:row.obstacleType,obstacleName:row.obstacleName,
    region:row.region,district:row.district,conditionRating:row.conditionRating,classAk:row.classAk,classNk:row.classNk,classEnz:row.classEnz,
    lengthMetres:row.lengthMetres===null?null:Number(row.lengthMetres),lengthRaw:row.lengthRaw,plannedWorks:row.plannedWorks,
    operator:row.operator,commissionedYear:row.commissionedYear,expertOpinion:row.expertOpinion,note:row.note,
    contractNumber:row.legacyContracts.map(c=>[c.customer,c.number,c.dateText].join(' · ')).join('\n'),
    executor:row.legacyExecutors.map(e=>e.name).join('\n'),
    legacyIds:row.legacyRows.map(r=>r.legacyId),importedAt:row.legacyRows[0]?.importedAt.toISOString()||null,
    importers:[...new Set(row.legacyRows.map(r=>names.get(r.importedById)||'Неизвестный сотрудник'))],
    creator:names.get(row.createdById)||'Неизвестный сотрудник',editor:names.get(row.updatedById)||'Неизвестный сотрудник',
    createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),legacyContracts:row.legacyContracts,legacyExecutors:row.legacyExecutors.map(e=>e.name)};
}
