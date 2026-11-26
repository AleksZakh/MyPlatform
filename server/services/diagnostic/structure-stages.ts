import {createError} from 'h3';
import type {Prisma} from '@prisma/client';
import {id,invalid} from './input';

type StageChange = {structureId:number;stage:number}

export function parseStructureStages(raw:unknown,count:number):StageChange[]{
  if(raw===undefined)return [];
  if(!Array.isArray(raw))return invalid('Некорректный список этапов сооружений.');
  const seen=new Set<number>();
  return raw.map(item=>{
    const structureId=id(item?.structureId),stage=id(item?.stage);
    if(stage>count)return invalid('Этап сооружения превышает количество этапов договора.');
    if(seen.has(structureId))return invalid('Сооружение указано в списке этапов дважды.');
    seen.add(structureId);
    return {structureId,stage};
  });
}

export async function saveStructureStages(tx:Prisma.TransactionClient,contractId:number,count:number,changes:StageChange[]){
  if(changes.length){
    const updated=await tx.$executeRaw`
      UPDATE diagnostic_contract_structures AS link SET stage = pick.stage
      FROM jsonb_to_recordset(${JSON.stringify(changes)}::jsonb) AS pick("structureId" integer,stage integer)
      JOIN diagnostic_structures s ON s.id = pick."structureId" AND s."deletedAt" IS NULL
      WHERE link."structureId" = pick."structureId" AND link."contractId" = ${contractId} AND link."deletedAt" IS NULL`;
    if(updated!==changes.length)throw createError({statusCode:409,message:'Перечень сооружений договора изменился. Откройте договор заново.'});
  }
  const outside=await tx.diagnosticContractStructure.findFirst({
    where:{contractId,deletedAt:null,structure:{deletedAt:null},stage:{gt:count}},
    select:{stage:true,structure:{select:{code:true}}},orderBy:{stage:'desc'}
  });
  if(outside)return invalid('Сооружению '+outside.structure.code+' назначен этап '+outside.stage+'. В перечне сооружений выберите этап от 1 до '+count+' и сохраните договор.');
}
