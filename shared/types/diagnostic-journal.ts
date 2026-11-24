export const journalKinds={
 DiagnosticContract:'Договоры', DiagnosticTrip:'Командировки', DiagnosticWorkTemplate:'Шаблоны',
 DiagnosticContractWork:'Работы с договором', DiagnosticStructureWork:'Работы по сооружению', DiagnosticStructure:'Сооружения', DiagnosticContractStructure:'Сооружения в договоре',
 DiagnosticWork:'Библиотека работ', DiagnosticWorkPlan:'Планирование', DiagnosticPlanCompletion:'Групповое завершение',
 DiagnosticCounterparty:'Контрагенты',DiagnosticProjectType:'Типы проектов',DiagnosticWorkCategory:'Категории работ'
} as const;
export interface JournalRow{id:number;kind:keyof typeof journalKinds;entity:number|null;title:string;time:string;action:string;author:string|null;editor:string|null;status:string|null;created:string|null;details:Record<string,{before?:unknown;after?:unknown}>|null}
export interface JournalPage{rows:JournalRow[];total:number}
