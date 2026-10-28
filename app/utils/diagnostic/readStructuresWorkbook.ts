import { structureHeaderKey } from '~~/shared/utils/diagnostic-structures';

/** Local workbook preview only: no upload, API call or database write. */
export interface StructureWorkbookSheet { name:string; rows:string[][]; }
export async function readStructuresWorkbook(file:File):Promise<StructureWorkbookSheet[]> {
  if(!/\.xlsx$/i.test(file.name)) throw new Error('Выберите файл .xlsx.');
  if(file.size>2*1024*1024) throw new Error('Размер файла не должен превышать 2 МБ.');
  const {default:ExcelJS}=await import('exceljs');
  const workbook=new ExcelJS.Workbook();
  // ExcelJS accepts ArrayBuffer in browsers; its Node-oriented declaration calls it Buffer.
  try { await workbook.xlsx.load(await file.arrayBuffer() as Parameters<typeof workbook.xlsx.load>[0]); }
  catch { throw new Error('Не удалось прочитать книгу. Проверьте, что файл имеет формат .xlsx, не повреждён и не защищён паролем.'); }
  const sheets:StructureWorkbookSheet[]=[];
  for(const sheet of workbook.worksheets) {
    if(!sheet.actualRowCount)continue;
    if(sheet.rowCount>10001 || sheet.columnCount>100) throw new Error('Для предварительного просмотра поддерживается до 10 000 строк и 100 столбцов на листе.');
    const rows:string[][]=[];
    for(let r=1;r<=sheet.rowCount;r++) {
      const row:string[]=[];
      for(let c=1;c<=sheet.columnCount;c++) {
        const cell=sheet.getCell(r,c), value=cell.value;
        if(value && typeof value==='object' && ('formula' in value || 'sharedFormula' in value)) {
          throw new Error(`Лист «${sheet.name}», ячейка ${cell.address}: замените формулу её значением перед просмотром.`);
        }
        if(value && typeof value==='object' && 'error' in value) throw new Error(`Лист «${sheet.name}», ячейка ${cell.address}: ошибка Excel.`);
        // Identifiers may have leading zeros in a text cell or an explicit Excel zero mask.
        const isCode=r>1 && structureHeaderKey(sheet.getCell(1,c).text)==='issoCode';
        if(isCode && typeof value==='number' && (!Number.isSafeInteger(value) || value<0)) {
          throw new Error(`Лист «${sheet.name}», ячейка ${cell.address}: код ИССО должен быть текстом или целым числом без потери точности.`);
        }
        const numericText=typeof value==='number' ? String(Number(value.toPrecision(15))) : '';
        row.push(isCode && typeof value==='number'
          ? (/^0+$/.test(cell.numFmt) ? String(value).padStart(cell.numFmt.length,'0') : String(value))
          : typeof value==='number' ? numericText : cell.text.trim());
      }
      rows.push(row);
    }
    sheets.push({name:sheet.name,rows});
  }
  if(!sheets.length)throw new Error('В книге нет заполненных листов.');
  return sheets;
}
