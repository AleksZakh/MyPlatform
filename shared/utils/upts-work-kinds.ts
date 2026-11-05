// Source: 30.10 таблица ДЛЯ CRM_V2.xlsx, Лист1 rows 3–20. OTHER is manual per customer clarification.
import type { UptsContractType } from '../types/upts-library';
export const UPTS_WORK_KINDS = [
  {
    "key": "LAND_FORMATION",
    "objectType": "LAND",
    "name": "Образование из НГС"
  },
  {
    "key": "LAND_DIVISION",
    "objectType": "LAND",
    "name": "Раздел"
  },
  {
    "key": "LAND_CHANGE",
    "objectType": "LAND",
    "name": "Учет изменений"
  },
  {
    "key": "LAND_RIGHT",
    "objectType": "LAND",
    "name": "Регистрация права"
  },
  {
    "key": "LAND_USE",
    "objectType": "LAND",
    "name": "Изменение ВРИ"
  },
  {
    "key": "LAND_TECH_ERROR",
    "objectType": "LAND",
    "name": "Техническая ошибка"
  },
  {
    "key": "LAND_REGISTER_ERROR",
    "objectType": "LAND",
    "name": "Реестровая ошибка"
  },
  {
    "key": "OKS_FORMATION",
    "objectType": "OKS",
    "name": "Образование"
  },
  {
    "key": "OKS_DIVISION",
    "objectType": "OKS",
    "name": "Раздел"
  },
  {
    "key": "OKS_CHANGE",
    "objectType": "OKS",
    "name": "Учет изменений"
  },
  {
    "key": "OKS_RIGHT",
    "objectType": "OKS",
    "name": "Регистрация права"
  },
  {
    "key": "OKS_SURVEY",
    "objectType": "OKS",
    "name": "Акт обследования"
  },
  {
    "key": "OKS_TECH_ERROR",
    "objectType": "OKS",
    "name": "Техническая ошибка"
  },
  {
    "key": "OKS_REGISTER_ERROR",
    "objectType": "OKS",
    "name": "Реестровая ошибка"
  },
  {
    "key": "ZOUIT_SERVITUDE",
    "objectType": "ZOUIT",
    "name": "Установление публичного сервитута"
  },
  {
    "key": "ZOUIT_PP",
    "objectType": "ZOUIT",
    "name": "Установление ПП"
  },
  {
    "key": "IPE_ASSESSMENT",
    "objectType": "IPE",
    "name": "Комплексная оценка территории"
  },
  {
    "key": "MARKS_LAYOUT",
    "objectType": "MARKS",
    "name": "Подготовка схемы закрепления точек и каталога координат"
  }
] as const;
export const workKindsFor = (type?:string|null) => UPTS_WORK_KINDS.filter(k=>k.objectType===type);
export const workKindName = (key?:string|null) => UPTS_WORK_KINDS.find(k=>k.key===key)?.name || '';
export function validWorkKind(type:UptsContractType|string|null,key?:string|null){return !key || UPTS_WORK_KINDS.some(k=>k.key===key && k.objectType===type);}
export const UPTS_WORK_ROLES = { CURATOR:'Куратор', ENGINEER:'Кадастровый инженер' } as const;
