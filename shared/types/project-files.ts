import type { WorkUser } from './work';
export type ProjectFileScope = 'SHARED' | 'PRIVATE';
export interface ProjectFileDTO {
  id: string; projectId: number; ownerId: number; scope: ProjectFileScope; name: string;
  size: number; version: number; createdAt: string; deletedAt: string | null; canManage: boolean;
  owner: WorkUser;
}
export interface ProjectFileList {
  items: ProjectFileDTO[]; total: number; page: number; maxBytes: number; canUpload: boolean;
}
