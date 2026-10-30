import type {StructureRecord} from '../types/diagnostic-structures';
import {structureLocationMetres} from './diagnostic-structures';
export const importTextFields = ['management','structureName','issoType','additionalId','roadName','location','placementType','obstacleType','obstacleName','region','district','conditionRating','classAk','classNk','classEnz','plannedWorks','operator','commissionedYear','expertOpinion','note'] as const;
export function parseStructureImportBatch(input:unknown) {
  if(!input || typeof input!=='object')throw new Error('Нет данных импорта.');
  const body=input as Record<string,unknown>;
  if(!Array.isArray(body.records)||!body.records.length||body.records.length>25)throw new Error('Пакет должен содержать от 1 до 25 сооружений.');
  if(typeof body.fileName!=='string'||body.fileName.length>255||body.fileName.includes('\0'))throw new Error('Некорректное имя файла.');
  const records=body.records.map((raw:unknown)=>{
    if(!raw||typeof raw!=='object')throw new Error('Некорректная строка.');
    const r=raw as Record<string,unknown>;
    const fields={} as Pick<StructureRecord,typeof importTextFields[number]>;
    for(const key of importTextFields){
      if(typeof r[key]!=='string'||(r[key] as string).length>16000||(r[key] as string).includes('\0'))throw new Error('Некорректное поле: '+key);
      fields[key]=(r[key] as string).trim();
    }
    if(typeof r.issoCode!=='string')throw new Error('Не указан код ИССО.');
    const code=r.issoCode.normalize('NFC').trim().toUpperCase();
    if(!code||code.length>200||code.includes('\0'))throw new Error('Некорректный код ИССО.');
    if(!fields.roadName||!fields.structureName||!fields.location)throw new Error('Заполните дорогу, сооружение и местоположение.');
    const locationMetres=structureLocationMetres(fields.location);
    if(locationMetres===null)throw new Error('Некорректное местоположение: '+code);
    if(r.contractNumber||r.executor)throw new Error('Договоры и исполнители назначаются отдельно.');
    const length=r.lengthMetres;
    if(length!==null&&(typeof length!=='number'||!Number.isFinite(length)||length<0||!/^\d{1,12}(?:\.\d{1,6})?$/.test(String(length))))throw new Error('Некорректная длина: '+code);
    const lengthRaw=typeof r.lengthRaw==='string'?r.lengthRaw:(length===null?'':String(length));
    if(lengthRaw && (!/^\d{1,12}(?:\.\d{1,6})?$/.test(lengthRaw)||Number(lengthRaw)!==length))throw new Error('Некорректная исходная длина: '+code);
    if(!lengthRaw&&length!==null)throw new Error('Не указана исходная длина: '+code);
    if(!Number.isSafeInteger(r.sourceRow)||Number(r.sourceRow)<2||Number(r.sourceRow)>20001)throw new Error('Некорректный номер строки.');
    return {sourceRow:Number(r.sourceRow),data:{...fields,code,locationMetres,lengthMetres:lengthRaw||null,lengthRaw}};
  });
  return {fileName:body.fileName,records};
}
