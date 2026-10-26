export interface WorkGroup { id: number; name: string }
export interface WorkCategory { id: number; groupId: number; name: string }
export interface WorkInput { groupId: number; categoryId: number; name: string; hours: string; criteria: string; note: string }
export interface WorkRecord extends WorkInput {
  id: number; version: number; code: string; sequence: number; group: string; category: string;
  createdById: number; updatedById: number; creator: string; editor: string; createdAt: string; updatedAt: string;
}
export interface WorkCatalog { groups: WorkGroup[]; categories: WorkCategory[] }

