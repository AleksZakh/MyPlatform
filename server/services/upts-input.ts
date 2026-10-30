import { z } from 'zod';
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + 'T00:00:00Z');
    return (
      Number.isFinite(d.getTime()) &&
      d.toISOString().slice(0, 10) === s &&
      s >= '1900-01-01' &&
      s <= '2200-12-31'
    );
  }, 'Неверная дата')
  .nullable();
export const uptsMetaInput = z
  .object({
    projectType: z.enum(['LAND', 'CONSTRUCTION', 'RIGHTS', 'OTHER']),
    status: z.enum(['INTAKE', 'ACTIVE', 'REVIEW', 'HANDOVER', 'DONE']),
    basis: z.string().trim().max(2000),
    initiator: z.string().trim().max(200),
    receivedDate: day,
    completionNote: z.string().trim().max(2000),
  })
  .strict()
  .refine(
    (v) => v.status !== 'DONE' || !!v.completionNote,
    'Укажите результат завершения проекта.',
  );
export const uptsDay = day;
