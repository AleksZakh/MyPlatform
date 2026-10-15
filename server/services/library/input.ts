import { z } from "zod";
import { createError } from "h3";
const text = (max: number) => z.string().trim().max(max).default("");
export const bookInput = z
  .object({
    title: z.string().trim().min(1).max(500),
    author: text(500),
    publisher: text(300),
    year: text(100),
    city: text(500),
    keywords: text(2000),
    note: text(20000),
    series: text(300),
    issue: text(100),
    pdfId: z.string().uuid(),
    coverId: z.string().uuid().nullable().default(null),
    categoryIds: z
      .array(z.number().int().positive())
      .min(1)
      .max(30)
      .transform((v) => [...new Set(v)]),
    clientKey: z.string().uuid().optional(),
    version: z.number().int().positive().optional(),
  })
  .strict();
export const categoryInput = z
  .object({
    name: z.string().trim().min(1).max(200),
    parentId: z.number().int().positive().nullable(),
    position: z.number().int().min(0).max(10000).default(0),
    icon: z
      .enum([
        "lucide:book-open",
        "lucide:graduation-cap",
        "lucide:flask-conical",
        "lucide:mountain",
        "lucide:layers",
        "lucide:hard-hat",
        "lucide:newspaper",
        "lucide:file-text",
        "lucide:ruler",
        "lucide:code",
      ])
      .default("lucide:book-open"),
    iconAssetId: z.string().uuid().nullable().default(null),
  })
  .strict();
export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success)
    throw createError({
      statusCode: 400,
      message: "Проверьте заполнение полей.",
      data: { issues: r.error.flatten() },
    });
  return r.data;
}
export function positiveId(v: unknown) {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 1)
    throw createError({
      statusCode: 400,
      message: "Некорректный идентификатор.",
    });
  return n;
}
