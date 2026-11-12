import path from 'node:path';
import {createHash} from 'node:crypto';
import {documentTypeStyle} from '../../shared/utils/upts-document-types';
function segment(value:string,max:number){return Array.from(value.normalize('NFC').replace(/[\\/:*?"<>|#%\[\]\x00-\x1f\x7f]/g,'_').replace(/\s+/g,' ').replace(/^[. ]+|[. ]+$/g,'')).slice(0,max).join('').replace(/[. ]+$/g,'')||'file';}
export function exportFolder(createdAt:string,id:string){
 const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(createdAt)).replace(/-/g,'');
 return `UPTS-${day}-${id.slice(0,6)}`;
}
/** Short local file paths, without bracket syntax, URL escaping or machine-specific roots. */
export function exportDocumentPath(f:{contractId:number;number:string;name:string;type:string},index:number){
 const style=documentTypeStyle(f.type),code=style.code==='OTHER'&&f.type!=='Иное'?'DOC-'+createHash('sha256').update(f.type).digest('hex').slice(0,6):style.code;
 const extension=path.extname(f.name).replace(/[^.a-zA-Z0-9]/g,'_').slice(0,12);
 return `Документы/Объект-${f.contractId}-${segment(f.number,12)}/${code}/${String(index+1).padStart(4,'0')}_${segment(path.basename(f.name,path.extname(f.name)),20)}${extension}`;
}
export const EXPORT_OPEN_INSTRUCTIONS=[
 'Как открыть документы из реестра',
 '1. Полностью распакуйте ZIP-архив в одну папку на компьютере.',
 '2. Откройте общую папку UPTS-…: в ней находятся Реестр.xlsx и подпапка Документы.',
 '3. Откройте Реестр.xlsx из этой распакованной папки, а не из окна архиватора.',
 '4. Нажмите название документа в таблице. Ссылка ведёт к файлу в подпапке Документы.',
 'Не переносите реестр отдельно и не переименовывайте вложенные папки или файлы. Переносить можно общую папку целиком.',
 'Для совместимости с Excel используйте короткий путь распаковки, без квадратных скобок, например C:\\UPTS.',
 'Имена файлов в архиве сокращены; полные исходные названия сохранены в реестре. Исходные документы в Space не переименовываются.',
 'Если выбран только реестр, документы не включаются и ссылки на них не создаются.',
];
