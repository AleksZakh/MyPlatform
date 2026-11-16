/** Display abbreviation only. The original department remains available in the tooltip. */
export function regionalCenterCode(department:string|null|undefined):string {
 const value=(department||'').normalize('NFKC').replace(/ё/gi,'е').toLocaleUpperCase('ru').replace(/\s+/g,' ').trim();
 if(!value)return '—';
 const codes=[...value.matchAll(/(?:^|[^А-Я])([А-Я]РЦ|МСК)(?=$|[^А-Я])/g)].map(m=>m[1]!);
 if(new Set(codes).size===1)return codes[0]!;
 if(codes.length)return '—';
 const centers=[...value.matchAll(/([А-Я]+(?:-[А-Я]+)*)\s+РЕГИОНАЛЬНЫЙ\s+ЦЕНТР/g)].map(m=>m[1]![0]+'РЦ');
 if(new Set(centers).size===1)return centers[0]!;
 if(centers.length)return '—';
 const plain=value.replace(/[.,;:—–-]+/g,' ').replace(/\s+/g,' ').trim();
 if(plain==='УПРАВЛЕНИЕ ДИАГНОСТИКИ ОТДЕЛ ДИАГНОСТИКИ ИСКУССТВЕННЫХ СООРУЖЕНИЙ')return 'МСК';
 // Do not invent a regional center for an unrecognized department.
 return '—';
}
