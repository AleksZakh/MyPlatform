import {mkdir,mkdtemp,readdir,readFile,rename,rm,writeFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {createError} from 'h3';
import ExcelJS from 'exceljs';
import {storageDepartments} from '../../storage/departments';
import {checkedStoragePath} from '../../storage/paths';
import {centerColors,type SavedReport,type ReportInfo} from '../../../../shared/utils/diagnostic-reports';

async function reportsFolder(){
  const departments=await storageDepartments();
  const group=departments.find(d=>d.active&&d.name.trim().toLocaleUpperCase('ru')==='ОДИС');
  if(!group)throw createError({statusCode:503,message:'Каталог активной группы ОДИС недоступен.'});
  return group.path+'/Reports';
}
const validId=(id:string)=>/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id);
async function directory(folder:string){
  let part='';
  for(const segment of folder.split('/')){
    part=part?part+'/'+segment:segment;
    const dest=await checkedStoragePath(part,true);
    try{await mkdir(dest);}catch(e:any){if(e.code!=='EEXIST')throw e;}
  }
  return checkedStoragePath(folder);
}
export function reportInfo({id,title,createdAt,params}:SavedReport):ReportInfo{return {id,title,createdAt,params};}
export const filename=(info:ReportInfo)=>info.title.replace(/ · /g,'_')+'.xlsx';
export async function workbook(r:SavedReport){
  const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Отчёт',{views:[{state:'frozen',ySplit:3}]});
  sheet.mergeCells(1,1,1,r.columns.length);
  sheet.getCell(1,1).value=r.title;sheet.getCell(1,1).font={bold:true,size:14};
  sheet.getCell(1,1).alignment={horizontal:'center'};sheet.getRow(1).height=24;
  sheet.getRow(3).values=r.columns;sheet.getRow(3).font={bold:true};
  r.columns.forEach((v,i)=>{sheet.getColumn(i+1).width=v==='Примечание'?65:v==='Название работ'?40:v==='№'?7:Math.min(38,Math.max(v.length+2,19));});
  for(const line of r.lines){
    const row=sheet.addRow(line.cells);
    row.eachCell((cell,column)=>{
      if(line.center)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+centerColors[line.center].slice(1)}};
      cell.alignment={vertical:'middle',wrapText:true};
      if(typeof cell.value==='number'&&column>=4)cell.numFmt='0.####';
    });
  }
  if(r.params.kind!=='timesheet'){
    const columns=r.params.kind==='external'?2:3;
    for(let i=0;i<r.lines.length;){
      let end=i+1;
      while(end<r.lines.length&&r.lines[end]!.group===r.lines[i]!.group)end++;
      if(end-i>1)for(let col=1;col<=columns;col++)sheet.mergeCells(i+4,col,end+3,col);
      i=end;
    }
  }
  if(r.totals)sheet.addRow(r.totals).font={bold:true};
  for(const warning of r.warnings){const row=sheet.addRow([warning]);sheet.mergeCells(row.number,1,row.number,r.columns.length);}
  return Buffer.from(await book.xlsx.writeBuffer());
}
export async function archiveReport(r:SavedReport){
  const root=await directory(await reportsFolder()),tmp=await mkdtemp(join(root,'.building-'));
  try{
    await writeFile(join(tmp,filename(r)),await workbook(r));
    await writeFile(join(tmp,'report.json'),JSON.stringify(r));
    await writeFile(join(tmp,'info.json'),JSON.stringify(reportInfo(r)));
    await rename(tmp,join(root,r.id));
  }finally{await rm(tmp,{recursive:true,force:true});}
}
async function stored(folder:string,id:string,file:string){
  if(!validId(id))throw createError({statusCode:404,message:'Отчёт не найден.'});
  if(!file||/[\\/]/.test(file))throw createError({statusCode:404,message:'Файл отчёта не найден.'});
  try{return await checkedStoragePath(folder+'/'+id+'/'+file);}
  catch(e:any){if(e.code==='ENOENT')throw createError({statusCode:404,message:'Отчёт удалён из хранилища.'});throw e;}
}
export async function history(){
  const folder=await reportsFolder(),root=await directory(folder),items:ReportInfo[]=[];
  for(const entry of await readdir(root,{withFileTypes:true})){
    if(!entry.isDirectory()||!validId(entry.name))continue;
    try{
      const info:ReportInfo=JSON.parse(await readFile(await stored(folder,entry.name,'info.json'),'utf8'));
      if((await stat(await stored(folder,entry.name,filename(info)))).isFile())items.push(info);
    }catch(e:any){if(e.statusCode!==404)throw e;}
  }
  return items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export async function archivedReport(id:string):Promise<SavedReport>{return JSON.parse(await readFile(await stored(await reportsFolder(),id,'report.json'),'utf8'));}
export async function reportAttachment(id:string){
  const folder=await reportsFolder();
  const info:ReportInfo=JSON.parse(await readFile(await stored(folder,id,'info.json'),'utf8'));
  return {filename:filename(info),path:await stored(folder,id,filename(info)),title:info.title};
}
