export interface AdminDashboardSummary {
  users: { total: number; active: number; pending: number; blocked: number; disabled: number } | null;
  structure: { groups: number; activeGroups: number; departments: number } | null;
  requests: { pending: number } | null;
  updatedAt: string;
}
export interface AdminDashboardActivity {
  summary: { events: number; users: number; logins: number; denied?: number };
  daily: { day: string; events: number; users: number }[];
  health: { enabled: boolean; dropped: number; lastErrorAt: string | null };
}
