import type { StructureRecord, StructureFilters, StructureSortKey, StructureField } from '../types/diagnostic-structures';

const collator = new Intl.Collator('ru', {numeric:true, sensitivity:'base'});
export const normalizeStructureText = (value: string) => value.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
export function blankStructureFilters(): StructureFilters {
  return {search:'',road:'',code:'',locationFrom:'',locationTo:'',management:[],regions:[],kind:'',issoType:'',withWorks:false};
}
/** A plain integer denotes kilometres. Metres after '+' must be in 0..999. */
export function structureLocationMetres(value: string): number | null {
  const match = /^(\d{1,7})(?:\s*\+\s*(\d{1,3}))?$/.exec(value.trim());
  return match ? Number(match[1]) * 1000 + Number(match[2] || 0) : null;
}
export function structureRangeError(filters: StructureFilters): string {
  const from = structureLocationMetres(filters.locationFrom), to = structureLocationMetres(filters.locationTo);
  if ((filters.locationFrom.trim() && from === null) || (filters.locationTo.trim() && to === null)) return 'Укажите километры или км+м: например, 16 или 16+550.';
  if (from !== null && to !== null && from > to) return 'Начало диапазона должно быть не больше конца.';
  return '';
}
export function filterStructures(rows: readonly StructureRecord[], filters: StructureFilters): StructureRecord[] {
  if (structureRangeError(filters)) return [];
  const tokens = normalizeStructureText(filters.search).split(/\s+/).filter(Boolean);
  const from = structureLocationMetres(filters.locationFrom), to = structureLocationMetres(filters.locationTo);
  const code = normalizeStructureText(filters.code);
  return rows.filter(row => {
    if (filters.road && row.roadName !== filters.road) return false;
    if (code && !normalizeStructureText(row.issoCode).includes(code)) return false;
    if (filters.management.length && !filters.management.includes(row.management)) return false;
    if (filters.regions.length && !filters.regions.includes(row.region)) return false;
    if (filters.kind && row.structureName !== filters.kind) return false;
    if (filters.issoType && row.issoType !== filters.issoType) return false;
    if (filters.withWorks && !row.plannedWorks.trim()) return false;
    const place = structureLocationMetres(row.location);
    if ((from !== null || to !== null) && (place === null || (from !== null && place < from) || (to !== null && place > to))) return false;
    const haystack = normalizeStructureText([
      row.roadName,row.structureName,row.issoType,row.issoCode,row.location,row.additionalId,
      row.management,row.region,row.district,row.obstacleName,row.obstacleType,row.placementType,
      row.plannedWorks,row.note,row.operator,row.contractNumber,row.executor,row.expertOpinion,row.conditionRating,
    ].join(' '));
    return tokens.every(token => haystack.includes(token));
  });
}
export function sortStructures(rows: readonly StructureRecord[], key: StructureSortKey, descending=false): StructureRecord[] {
  return [...rows].sort((a,b) => {
    const an=structureLocationMetres(a.location), bn=structureLocationMetres(b.location);
    // Unparseable locations stay last in both directions, rather than pretending to be zero.
    if (key==='location' && (an===null || bn===null) && an!==bn) return an===null ? 1 : -1;
    const primary=key==='location' && an!==null && bn!==null ? an-bn : collator.compare(a[key],b[key]);
    const tie=collator.compare(a.roadName,b.roadName) || (an!==null&&bn!==null ? an-bn : 0) || collator.compare(a.issoCode,b.issoCode);
    return (primary || tie) * (descending ? -1 : 1);
  });
}
export function structureValue(row: StructureRecord, key: StructureField): string {
  if(key==='lengthMetres' && row.lengthRaw?.trim())return row.lengthRaw;
  const value=row[key];
  if (value==null || value==='') return '—';
  return typeof value==='number' ? value.toLocaleString('ru-RU',{maximumFractionDigits:6}) : value;
}
export function structureOptions(rows: readonly StructureRecord[], key: 'management'|'region'|'roadName'|'structureName'|'issoType'): string[] {
  return [...new Set(rows.map(row=>row[key]).filter(Boolean))].sort(collator.compare);
}

export const structureImportHeaders: Record<string, StructureField> = {
  '№':'sourceOrdinal', 'управление':'management', 'сооружение':'structureName', 'тип иссо':'issoType',
  'дополнительный идентификатор':'additionalId', 'название автодороги':'roadName',
  'местоположение, км+м':'location', 'тип расположения':'placementType',
  'тип основного препятствия':'obstacleType', 'название основного препятствия':'obstacleName',
  'регион расположения':'region', 'район расположения':'district', 'код иссо':'issoCode',
  'оценка тс':'conditionRating', 'класс ак':'classAk', 'класс нк':'classNk', 'класс энз':'classEnz',
  'длина, м':'lengthMetres', 'запланированные работы':'plannedWorks',
  'эксплуатирующая организация':'operator', 'ввод в эксплуатацию':'commissionedYear',
  'экспертное заключение':'expertOpinion', '№ договора':'contractNumber', 'исполнитель':'executor', 'примечание':'note',
};
export function structureHeaderKey(value: string): StructureField | undefined {
  return structureImportHeaders[normalizeStructureText(value).replace(/\s+/g,' ')];
}
export interface StructureImportIssue { row: number; code: string; reason: string; }
export interface StructureImportPlan {
  total: number; records: StructureRecord[]; skipped: StructureImportIssue[];
  errors: StructureImportIssue[]; ignoredHeaders: string[];
}
/** Pure preview planner. Existing codes are skipped and never overwritten. */
export function planStructureImport(matrix: readonly (readonly string[])[], existing: readonly Pick<StructureRecord,'issoCode'>[], fileName: string, note=''): StructureImportPlan {
  if (!matrix.length) throw new Error('В листе нет данных.');
  const headers=matrix[0] || [], keys=headers.map(structureHeaderKey);
  const required: StructureField[]=['issoCode','roadName','structureName','location'];
  for (const key of required) if (!keys.includes(key)) throw new Error('Не найден обязательный столбец: '+Object.keys(structureImportHeaders).find(h=>structureImportHeaders[h]===key));
  const seenHeaders=new Set<string>();
  keys.forEach(key=>{ if(key && seenHeaders.has(key)) throw new Error('В файле повторяется столбец: '+key); if(key)seenHeaders.add(key); });
  const plan:StructureImportPlan={total:0,records:[],skipped:[],errors:[],ignoredHeaders:headers.filter((h,i)=>h.trim()&&!keys[i])};
  const seen=new Set(existing.map(row=>normalizeStructureText(row.issoCode)));
  for(let index=1;index<matrix.length;index++) {
    const cells=matrix[index] || [];
    if(!cells.some(c=>c.trim()))continue;
    plan.total++;
    const text:Partial<Record<StructureField,string>>={};
    keys.forEach((key,col)=>{if(key)text[key]=(cells[col]||'').trim();});
    const code=text.issoCode || '', normalized=normalizeStructureText(code), row=index+1;
    if(code && seen.has(normalized)) {plan.skipped.push({row,code,reason:'Код уже есть в списке или ранее в этом файле'});continue;}
    const missing=required.filter(k=>!text[k]);
    if(missing.length){plan.errors.push({row,code,reason:'Не заполнены: '+missing.map(k=>Object.keys(structureImportHeaders).find(h=>structureImportHeaders[h]===k)).join(', ')});continue;}
    if(structureLocationMetres(text.location || '')===null){plan.errors.push({row,code,reason:'Местоположение должно иметь формат км+м, например 16+550'});continue;}
    const rawLength=(text.lengthMetres||'').replace(/\s/g,'').replace(',','.');
    if(rawLength && (!/^\d+(?:\.\d+)?$/.test(rawLength)||!Number.isFinite(Number(rawLength)))){plan.errors.push({row,code,reason:'Длина должна быть неотрицательным числом'});continue;}
    const record:StructureRecord={
      id:'preview:'+normalized,sourceRow:row,sourceFile:fileName,sourceOrdinal:text.sourceOrdinal||'',
      management:text.management||'',structureName:text.structureName||'',issoType:text.issoType||'',
      additionalId:text.additionalId||'',roadName:text.roadName||'',location:text.location||'',
      placementType:text.placementType||'',obstacleType:text.obstacleType||'',obstacleName:text.obstacleName||'',
      region:text.region||'',district:text.district||'',issoCode:code,conditionRating:text.conditionRating||'',
      classAk:text.classAk||'',classNk:text.classNk||'',classEnz:text.classEnz||'',
      lengthMetres:rawLength?Number(Number(rawLength).toPrecision(15)):null,plannedWorks:text.plannedWorks||'',
      operator:text.operator||'',commissionedYear:text.commissionedYear||'',expertOpinion:text.expertOpinion||'',
      contractNumber:text.contractNumber||'',executor:text.executor||'',note:[text.note,note.trim()].filter(Boolean).join('\n'),
    };
    plan.records.push(record);seen.add(normalized);
  }
  return plan;
}
