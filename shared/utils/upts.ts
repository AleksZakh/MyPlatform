import type { WorkTaskDTO } from '../types/work';
import type { UptsSnapshot } from '../types/upts';
export function taskSummary(
  tasks: Pick<
    WorkTaskDTO,
    'status' | 'dueDate' | 'blockedReason' | 'assigneeId'
  >[],
  today: string,
) {
  const done = tasks.filter((t) => t.status === 'DONE').length;
  return {
    total: tasks.length,
    done,
    active: tasks.length - done,
    overdue: tasks.filter(
      (t) => t.status !== 'DONE' && t.dueDate && t.dueDate.slice(0, 10) < today,
    ).length,
    blocked: tasks.filter(
      (t) => t.status !== 'DONE' && !!t.blockedReason.trim(),
    ).length,
    unassigned: tasks.filter((t) => t.status !== 'DONE' && !t.assigneeId)
      .length,
    percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  };
}
export function filterUpts(data: UptsSnapshot, filters: {
  projectId?: number | null; contractId?: number | null; employeeId?: number | null; q?: string;
}) {
  const q = (filters.q || '').trim().toLocaleLowerCase('ru');
  const matches = (...values: (string | null | undefined)[]) => !q || values.some(v => v?.toLocaleLowerCase('ru').includes(q));
  let projects = data.projects.filter(p => (!filters.projectId || p.id === filters.projectId) && (!filters.contractId || p.upts.contracts.some(c=>c.id===filters.contractId)));
  const byId = new Map(projects.map(p=>[p.id,p]));
  const tasks = data.tasks.filter(t => {
    const p=byId.get(t.projectId!); if(!p) return false;
    if(filters.contractId && t.uptsContractId!==filters.contractId) return false;
    if(filters.employeeId && t.assigneeId!==filters.employeeId) return false;
    const c=p.upts.contracts.find(c=>c.id===t.uptsContractId);
    return matches(t.title,t.description,p.name,t.assignee?.fullName,t.assignee?.login,c?.number,c?.name);
  });
  projects=projects.map(p=>({...p,upts:{...p.upts,contracts:p.upts.contracts.filter(c=>
    (!filters.contractId||c.id===filters.contractId) &&
    (!filters.employeeId||tasks.some(t=>t.uptsContractId===c.id)) &&
    (matches(c.number,c.name,p.name)||tasks.some(t=>t.uptsContractId===c.id))
  )}}));
  if(filters.employeeId||q)projects=projects.filter(p=>tasks.some(t=>t.projectId===p.id)||p.upts.contracts.length>0||(!filters.employeeId&&matches(p.name)));
  return {...data,projects,tasks};
}
