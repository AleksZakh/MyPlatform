import type {UptsLibrary,UptsWorkDefinition} from '../types/upts-library';
import {workKindsFor} from './upts-work-kinds';

/** Union by library identity; shared work keeps every selected source kind. */
export function uptsWorkCandidates(library:UptsLibrary|null,type:string,selectedKinds:string[]){
  const rows=new Map<number,{work:UptsWorkDefinition;kindKeys:string[]}>();
  for(const kind of workKindsFor(type).filter(k=>selectedKinds.includes(k.key))){
    for(const template of library?.templates.filter(t=>t.active && t.contractType===type && t.workKindKey===kind.key) || []){
      for(const item of template.items){
        if(!item.work.active || item.work.contractType!==type)continue;
        const row=rows.get(item.work.id);
        if(row){if(!row.kindKeys.includes(kind.key))row.kindKeys.push(kind.key);}
        else rows.set(item.work.id,{work:item.work,kindKeys:[kind.key]});
      }
    }
  }
  return [...rows.values()];
}
