import { prisma } from '../../utils/prisma';
import { id } from './input';
import { readableStructure } from './structures';
import { structureGroups } from '../../../shared/types/diagnostic-structures';
import type { StructureHistoryEntry, StructureHistoryPage } from '../../../shared/types/diagnostic-structures-api';

const labels = new Map<string,string>(structureGroups.flatMap(g => g.fields.map(f => [f.key,f.label] as const)));
labels.set('code','Код ИССО');
labels.set('lengthRaw','Длина, м');
labels.set('status','Состояние сооружения');
const value = (v:unknown) => typeof v === 'string' || typeof v === 'number' ? String(v) : '';
const pageSize = 25;
export async function readStructureHistory(structureId:number, contractId:number|undefined, raw:unknown):Promise<StructureHistoryPage> {
  const before = raw === undefined ? undefined : id(raw);
  const structure = await prisma.diagnosticStructure.findFirst({where:readableStructure(structureId,contractId),select:{id:true}});
  if (!structure) throw createError({statusCode:404,message:'Сооружение не найдено.'});
  const rows = await prisma.diagnosticStructureHistory.findMany({
    where:{structureId,...(before ? {id:{lt:before}} : {})}, orderBy:{id:'desc'}, take:pageSize+1,
  });
  const entries = rows.slice(0,pageSize);
  const actorIds = [...new Set(entries.flatMap(r => r.actorId ? [r.actorId] : []))];
  const users = await prisma.user.findMany({where:{id:{in:actorIds}},select:{id:true,login:true,fullName:true}});
  const authors = new Map(users.map(u => [u.id,u.fullName || u.login]));
  const items = entries.map(r => {
    const delta = r.changes && typeof r.changes==='object' && !Array.isArray(r.changes) ? r.changes : {};
    const fields:StructureHistoryEntry['fields'] = [];
    for (const [key, change] of Object.entries(delta)) {
      const label = labels.get(key);
      if (!label || key==='lengthMetres' && 'lengthRaw' in delta || !change || typeof change!=='object' || Array.isArray(change)) continue;
      if (!('before' in change || 'after' in change)) continue;
      fields.push({label,before:value(change.before),after:value(change.after)});
    }
    return {id:r.id,date:r.occurredAt.toISOString(),action:r.action,source:r.source,fields,
      actor:r.actorId===0?'Обновление ОДИС':authors.get(r.actorId ?? -1) || r.actorLabel || 'Автор не указан'};
  });
  return {items,next:rows.length>pageSize ? items.at(-1)!.id : null};
}
