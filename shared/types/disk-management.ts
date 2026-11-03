export interface DiskVolume {
  id: string; paths: string[]; total: number; used: number; available: number; reserved: number;
  usedPercent: number; inodes: number; freeInodes: number;
}
export interface DiskScannerState { ready: boolean; code: string; message: string; retryAfter?: number }
export interface DiskSummary { checkedAt: string; volumes: DiskVolume[]; warnings: string[]; scanner?: DiskScannerState }
export interface DiskScanItem {
  path: string; category: 'release' | 'log'; status: 'candidate' | 'protected' | 'review';
  bytes: number | null; reclaimable: number; reason: string; modifiedAt: string | null;
}
export interface DiskScanReport {
  version: 1; status: 'complete' | 'partial' | 'busy' | 'unavailable'; checkedAt: string;
  durationMs: number; candidateBytes: number; items: DiskScanItem[]; warnings: string[];
  policy: { keepLatest: number; logDays: number };
}
