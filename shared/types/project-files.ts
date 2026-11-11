import type { WorkUser } from './work';
export type ProjectFileScope = 'SHARED' | 'PRIVATE';
export interface ProjectFileDTO {
  id: string; projectId: number; ownerId: number; scope: ProjectFileScope; name: string;
  storagePath?:string|null;documentDate?:string|null;documentComment?:string;documentFolder?:string|null;taskId?:number|null;documentType?:string|null;
  size: number; version: number; createdAt: string; deletedAt: string | null; canManage: boolean;
  owner: WorkUser;
}
export interface ProjectFileList {
  items: ProjectFileDTO[]; total: number; page: number; maxBytes: number; canUpload: boolean;
}

export type UptsFileWorkState={id:number;previousVersion:number;version:number;status:import('./work').WorkTaskDTO['status'];resultCheck:ReturnType<typeof import('../utils/upts-work-results').evaluateWorkResult>};
