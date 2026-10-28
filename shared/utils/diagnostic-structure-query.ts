import type {StructureQuery} from '../types/diagnostic-structures-api';
import type {StructureSortKey} from '../types/diagnostic-structures';
import {structureRangeError} from './diagnostic-structures';
const sortKeys:StructureSortKey[]=['roadName','structureName','issoCode','location','region','management'];
/** Validate H3 query strings. Reject arrays except explicitly multi-value filters. */
export function parseStructureQuery(query:Record<string,unknown>):StructureQuery {
  function text(key:string,max=500){const value=query[key];if(value===undefined)return '';if(typeof value!=='string'||value.length>max)throw Error('Некорректный параметр: '+key);return value.trim();}
  function exact(key:string){const value=query[key];if(value===undefined)return '';if(typeof value!=='string'||value.length>2000)throw Error('Некорректный параметр: '+key);return value;}
  function list(key:string){const raw=query[key];const values=raw===undefined?[]:Array.isArray(raw)?raw:[raw];if(values.length>200||values.some(v=>typeof v!=='string'||v.length>2000))throw Error('Некорректный фильтр: '+key);return [...new Set(values as string[])].filter(Boolean);}
  function integer(key:string,fallback:number){const value=text(key,10);if(!value)return fallback;const n=Number(value);if(!/^\d+$/.test(value)||!Number.isSafeInteger(n)||n<1)throw Error('Некорректный параметр: '+key);return n;}
  function flag(key:string){const value=text(key,5);if(!['','true','false','1','0'].includes(value))throw Error('Некорректный параметр: '+key);return value==='true'||value==='1';}
  const page=integer('page',1),pageSize=integer('pageSize',25),sortKey=(text('sortKey',30)||'roadName') as StructureSortKey;
  if(page>1000000||![25,50,100].includes(pageSize)||!sortKeys.includes(sortKey))throw Error('Некорректные параметры страниц или сортировки.');
  const filters={search:text('search',300),road:exact('road'),code:text('code',200),locationFrom:text('locationFrom',30),locationTo:text('locationTo',30),management:list('management'),regions:list('regions'),kind:exact('kind'),issoType:exact('issoType'),withWorks:flag('withWorks')};
  const error=structureRangeError(filters);if(error)throw Error(error);
  if(filters.search.split(/\s+/).filter(Boolean).length>12)throw Error('В поисковом запросе должно быть не больше 12 слов.');
  return {filters,page,pageSize,sortKey,descending:flag('descending')};
}
