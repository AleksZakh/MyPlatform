export interface DepartmentStorage {
  key: string; name: string; path: string; departmentIds: number[]; groupIds?: number[]; active: boolean;
}
export interface StorageUsageRow {
  key: string; name: string; bytes: number; logicalBytes: number; files: number; percent: number | null;
}
export interface StorageUsageReport {
  checkedAt: string; durationMs: number; status: 'complete' | 'partial'; totalBytes: number;
  rows: StorageUsageRow[]; warnings: string[];
}
