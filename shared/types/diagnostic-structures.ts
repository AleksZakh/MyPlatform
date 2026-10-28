export interface StructureRecord {
  id: string;
  sourceFile: string;
  sourceRow: number;
  sourceOrdinal: string;
  management: string;
  structureName: string;
  issoType: string;
  additionalId: string;
  roadName: string;
  location: string;
  placementType: string;
  obstacleType: string;
  obstacleName: string;
  region: string;
  district: string;
  issoCode: string;
  conditionRating: string;
  classAk: string;
  classNk: string;
  classEnz: string;
  lengthMetres: number | null;
  plannedWorks: string;
  operator: string;
  commissionedYear: string;
  expertOpinion: string;
  contractNumber: string;
  executor: string;
  note: string;
}
export type StructureField = Exclude<keyof StructureRecord, 'id' | 'sourceFile' | 'sourceRow'>;
export interface StructureFieldInfo { key: StructureField; label: string; }
export const structureGroups: { key: string; label: string; fields: StructureFieldInfo[] }[] = [
  { key: 'main', label: 'Основное', fields: [
    {key:'management',label:'Управление / рег. центр'}, {key:'roadName',label:'Автодорога'},
    {key:'location',label:'Местоположение, км+м'}, {key:'issoCode',label:'Код ИССО'},
    {key:'structureName',label:'Сооружение'}, {key:'issoType',label:'Тип ИССО'},
    {key:'additionalId',label:'Дополнительный идентификатор'}, {key:'placementType',label:'Тип расположения'},
    {key:'region',label:'Регион'}, {key:'district',label:'Район'},
  ]},
  { key: 'technical', label: 'Характеристики', fields: [
    {key:'obstacleType',label:'Тип основного препятствия'}, {key:'obstacleName',label:'Основное препятствие'},
    {key:'lengthMetres',label:'Длина, м'}, {key:'conditionRating',label:'Оценка ТС'},
    {key:'classAk',label:'Класс АК'}, {key:'classNk',label:'Класс НК'}, {key:'classEnz',label:'Класс ЭНз'},
    {key:'operator',label:'Эксплуатирующая организация'}, {key:'commissionedYear',label:'Ввод в эксплуатацию'},
    {key:'expertOpinion',label:'Экспертное заключение'},
  ]},
  { key: 'work', label: 'Работы и примечания', fields: [
    {key:'plannedWorks',label:'Запланированные работы'}, {key:'contractNumber',label:'№ договора'},
    {key:'executor',label:'Исполнитель'}, {key:'note',label:'Примечание'},
  ]},
];
export interface StructureFilters {
  search: string; road: string; code: string; locationFrom: string; locationTo: string;
  management: string[]; regions: string[]; kind: string; issoType: string; withWorks: boolean;
}
export type StructureSortKey = 'roadName'|'structureName'|'issoCode'|'location'|'region'|'management';
export const structureColumns: {key: StructureSortKey; label:string}[] = [
  {key:'roadName',label:'Автодорога'}, {key:'structureName',label:'Сооружение'},
  {key:'issoCode',label:'Код ИССО'}, {key:'location',label:'Место, км+м'},
  {key:'region',label:'Регион'}, {key:'management',label:'Управление'},
];
