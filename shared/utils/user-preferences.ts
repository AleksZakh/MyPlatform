import { z } from 'zod';
export const displaySchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  contrast: z.enum(['normal', 'high']).default('normal'),
  textSize: z.enum(['normal', 'large', 'largest']).default('normal'),
  density: z.enum(['compact', 'comfortable']).default('compact'),
  expandedForms: z.boolean().default(false),
}).strict();
export const notificationsSchema = z.object({
  information: z.boolean().default(true), success: z.boolean().default(true),
  chatPopup: z.boolean().default(true), chatSound: z.boolean().default(false),
}).strict();
const ids = z.array(z.string().min(1).max(120)).max(100);
export const tableSchema = z.object({ visibleColumns: ids.min(1), columnOrder: ids }).strict().nullable();
export const preferencesSchema = z.object({
  display: displaySchema.default(() => displaySchema.parse({})), notifications: notificationsSchema.default(() => notificationsSchema.parse({})),
  labTable: tableSchema.default(null),
}).strict();
export const preferencesPatchSchema = z.object({ display: displaySchema.optional(), notifications: notificationsSchema.optional(), labTable: tableSchema.optional() }).strict().refine(v => Object.keys(v).length > 0);
export type UserPreferences = z.infer<typeof preferencesSchema>;
export function defaultPreferences(): UserPreferences { return preferencesSchema.parse({}); }
export function normalizePreferences(value: unknown): UserPreferences {
  const result = preferencesSchema.safeParse(value);
  return result.success ? result.data : defaultPreferences();
}
export function allowNotification(settings: UserPreferences['notifications'], color?: string) {
  if (color === 'error' || color === 'warning') return true;
  return color === 'success' ? settings.success : settings.information;
}
