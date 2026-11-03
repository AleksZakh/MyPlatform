import { lstat, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import type { DiskScannerState } from '../../../shared/types/disk-management';
export const scannerCommand = '/usr/local/sbin/space-disk-report';
export async function scannerStatus(): Promise<DiskScannerState> {
  try {
    const stat = await lstat(scannerCommand);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== 0 || (stat.mode & 0o022) !== 0) {
      return { ready: false, code: 'SCANNER_UNSAFE', message: 'Проверьте установку space-disk-report: нужен обычный файл владельца root без разрешения записи для группы и остальных пользователей.' };
    }
    await access(scannerCommand, constants.X_OK);
  } catch {
    return { ready: false, code: 'SCANNER_MISSING', message: 'Служебная команда space-disk-report не установлена или недоступна для запуска. Установите её на сервере по инструкции ниже.' };
  }
  try { await access('/usr/bin/sudo', constants.X_OK); }
  catch { return { ready: false, code: 'SUDO_MISSING', message: 'На сервере недоступна команда /usr/bin/sudo. Проверьте установку службы проверки диска.' }; }
  return { ready: true, code: 'READY', message: 'Служебная команда найдена. Разрешение sudo проверяется при запуске.' };
}
