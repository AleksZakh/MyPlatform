export interface LibraryVideo {
  canResume?: boolean; id: string; title: string; description: string; author: string; filename: string;
  totalBytes: number; offset: number; status: 'UPLOADING'|'QUEUED'|'PROCESSING'|'READY'|'ERROR';
  duration: number|null; hasPoster: boolean; error: string|null; version: number; createdBy: number;
  deletedAt: string|null; categories: { categoryId: number }[];
}
export const videoStatus: Record<LibraryVideo['status'], string> = {
  UPLOADING: 'Загрузка не завершена', QUEUED: 'В очереди', PROCESSING: 'Обрабатывается', READY: 'Готово', ERROR: 'Ошибка обработки',
};
export function videoDuration(n: number|null) {
  if (!n) return '';
  const s = Math.floor(n); return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map((v,i) => i ? String(v).padStart(2,'0') : String(v)).join(':');
}
