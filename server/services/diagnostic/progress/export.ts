import ExcelJS from 'exceljs';

import { archiveProgressFile } from '../reports/archive';
import { progressReport } from '../progress';
import { progressHeaders } from '../../../../shared/utils/diagnostic-progress';
import { storageSegment } from '../../storage/paths';
import { tripToday } from '../../../../shared/utils/diagnostic-trip-lifecycle';

export async function exportProgress(event: import('h3').H3Event) {
  const body = await readBody(event);
  const report = await progressReport(event, body?.filters);
  if (report.token !== body?.token)
    throw createError({
      statusCode: 409,
      message: 'Таблица изменилась. Сформируйте её заново перед сохранением в Excel.',
    });
  const book = new ExcelJS.Workbook();
  const used = new Set<string>();
  for (const contract of report.contracts) {
    const base =
      contract.number
        .replace(/[\\/:?*\[\]\x00-\x1f]/g, ' ')
        .replace(/^'+|'+$/g, '')
        .trim() || 'Договор';
    let title = base.slice(0, 31).replace(/'+$/g, ''),
      suffix = 0;
    while (used.has(title.toLowerCase()) || title.toLowerCase() === 'history') {
      const extra = ' (' + ++suffix + ')';
      title = base.slice(0, 31 - extra.length) + extra;
    }
    used.add(title.toLowerCase());
    const sheet = book.addWorksheet(title, { views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }] });
    sheet.columns = progressHeaders.map((header, i) => ({
      header,
      width: [9, 11, 8, 32, 25, 15, 15, 22, 45, 28, 28, 37, 43, 25, 25, 58][i],
    }));
    const head = sheet.getRow(1);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF196580' } };
    head.height = 34;
    head.alignment = { wrapText: true, vertical: 'middle' };
    const codeColumn = sheet.getColumn(7);
    for (const row of report.rows.filter((r) => r.contractId === contract.id)) {
      const values: (string | number)[] = [...row.values];
      values[2] = row.stage;
      for (const i of [0, 1])
        if (/^(0|[1-9]\d{0,13})$/.test(row.values[i]!)) values[i] = Number(row.values[i]);
      if (/^\d{1,12}([.,]\d{1,6})?$/.test(row.structure.lengthRaw))
        values[7] = Number(row.structure.lengthRaw.replace(',', '.'));
      if (values.some((v) => typeof v === 'string' && v.length > 32767))
        throw createError({
          statusCode: 422,
          message: 'Одна из ячеек превышает допустимые для Excel 32 767 символов.',
        });
      const line = sheet.addRow(values);
      line.alignment = { wrapText: true, vertical: 'top' };
      const code = line.getCell(7);
      code.numFmt = '@';
      code.alignment = { vertical: 'top', wrapText: false, shrinkToFit: true };
      codeColumn.width = Math.max(codeColumn.width ?? 15, Math.min(255, row.structure.code.length + 2));
      if (row.active) line.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCF1E4' } };
    }
    sheet.autoFilter = { from: 'A1', to: 'P1' };
  }
  const bytes = Buffer.from(await book.xlsx.writeBuffer());
  const label =
    report.contracts.length === 1
      ? Array.from(storageSegment(report.contracts[0]!.number)).slice(0, 35).join('')
      : 'Договоры_' + report.contracts.length;
  const name = 'Ход работ_' + label + '_' + tripToday().split('-').reverse().join('.') + '.xlsx';
  await archiveProgressFile(name, bytes);
  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  setHeader(event, 'Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(name));
  return bytes;
}
