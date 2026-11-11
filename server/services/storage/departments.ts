import { mkdir, lstat } from 'node:fs/promises';
import { prisma } from '../../utils/prisma';
import { checkedStoragePath } from './paths';
import type { DepartmentStorage } from '../../../shared/types/department-storage';

// The API names remain compatible with older clients. Catalog ownership is SpaceGroup only.
const normalize=(s:string)=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
export function groupCatalog(groups:{id:number;name:string;isActive:boolean;storagePath?:string|null}[]):DepartmentStorage[]{
 const occupied=new Set(groups.flatMap(g=>g.storagePath?[g.storagePath]:[]));
 return [...groups].sort((a,b)=>a.id-b.id).map(g=>{
  const name=normalize(g.name);
  const legacy=['лаборанты','лабораторный контроль','лаборатория'].includes(name)?'lab':['диагносты','диагностика','одис'].includes(name)?'diagnostic':['уптс','upts','управление подготовки территории строительства'].includes(name)?'upts':null;
  const path=g.storagePath || (legacy&&!occupied.has(legacy)?legacy:'groups/'+g.id);occupied.add(path);
  return {key:['lab','diagnostic','upts'].includes(path)?path:'group-'+g.id,name:g.name,path,groupIds:[g.id],departmentIds:[],active:g.isActive};
 });
}
export async function storageDepartments(){return groupCatalog(await prisma.spaceGroup.findMany({select:{id:true,name:true,isActive:true,storagePath:true},orderBy:{id:'asc'}}));}
export async function directoryExists(relative:string):Promise<boolean>{
 try{return (await lstat(await checkedStoragePath(relative))).isDirectory();}
 catch(e:any){if(e.code==='ENOENT')return false;throw e;}
}
/** Stable group binding; existing department folders are never moved or deleted. */
export async function ensureDepartmentDirectory(relative:string){
 const entry=(await storageDepartments()).find(d=>d.path===relative);
 if(!entry?.active||!entry.groupIds?.length)throw new Error('Неизвестная или неактивная группа Space');
 await prisma.spaceGroup.updateMany({where:{id:{in:entry.groupIds},storagePath:null},data:{storagePath:relative}});
 let prefix='';
 for(const part of relative.split('/')){
  // Resolve every component again to reject symlinks.
  prefix=[prefix,part].filter(Boolean).join('/');
  const target=await checkedStoragePath(prefix,true);
  try{await mkdir(target,{mode:0o750});}catch(e:any){if(e.code!=='EEXIST')throw e;}
  if(!await directoryExists(prefix))throw new Error('Ожидался каталог группы Space');
 }
}
