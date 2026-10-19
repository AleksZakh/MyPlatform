export const LAB_DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.jfif,.png';

/** Same client-side rules for file dialog and drop. Server validation remains authoritative. */
export function documentSelectionError(files: readonly { name: string; type: string; size: number }[], accept: string): string | null {
 if (files.length !== 1) return 'Перетащите один файл в одно поле документа.';
 const file=files[0]!;
 if (!file.size) return 'Файл пуст. Выберите другой файл.';
 const name=file.name.toLowerCase(), mime=file.type.toLowerCase();
 const types=accept.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 if (types.length && !types.some(t=>t.startsWith('.')?name.endsWith(t):t.endsWith('/*')?mime.startsWith(t.slice(0,-1)):mime===t))
  return 'Этот формат не поддерживается. Допустимы: '+accept;
 return null;
}
