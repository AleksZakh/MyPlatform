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
export function filterUpts(
  data: UptsSnapshot,
  filters: {
    projectId?: number | null;
    employeeId?: number | null;
    q?: string;
  },
) {
  const q = (filters.q || '').trim().toLocaleLowerCase('ru');
  let projects = data.projects.filter(
    (p) => !filters.projectId || p.id === filters.projectId,
  );
  let tasks = data.tasks.filter((t) =>
    projects.some((p) => p.id === t.projectId),
  );
  if (filters.employeeId)
    tasks = tasks.filter((t) => t.assigneeId === filters.employeeId);
  if (q)
    tasks = tasks.filter((t) =>
      [
        t.title,
        t.description,
        t.project?.name,
        t.assignee?.fullName,
        t.assignee?.login,
      ].some((v) => v?.toLocaleLowerCase('ru').includes(q)),
    );
  if (filters.employeeId || q)
    projects = projects.filter((p) => tasks.some((t) => t.projectId === p.id));
  return { ...data, projects, tasks };
}
