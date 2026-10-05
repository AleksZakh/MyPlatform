import type { Prisma } from '@prisma/client';

/** Calendar dates only; reject overflow (for example, 31.02.2025). */
export function parseRegistrySearchDate(value: string): Date | null {
  const local = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!local && !iso) return null;

  const year = Number(local ? local[3] : iso?.[1]);
  const month = Number(local ? local[2] : iso?.[2]);
  const day = Number(local ? local[1] : iso?.[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day ? date : null;
}

/** Recognize an exact day, a calendar month or a calendar year. */
export function parseRegistrySearchDateRange(value: string): { gte: Date; lt: Date } | null {
  const input = value.trim();
  let start = parseRegistrySearchDate(input);
  let unit: 'day' | 'month' | 'year' = 'day';
  if (!start) {
    const month = /^(\d{2})\.(\d{4})$/.exec(input);
    const isoMonth = /^(\d{4})-(\d{2})$/.exec(input);
    if (month || isoMonth) {
      const year = month ? month[2] : isoMonth![1];
      const number = month ? month[1] : isoMonth![2];
      start = parseRegistrySearchDate(`01.${number}.${year}`);
      unit = 'month';
    } else if (/^\d{4}$/.test(input)) {
      start = parseRegistrySearchDate(`01.01.${input}`);
      unit = 'year';
    }
  }
  if (!start) return null;
  const end = new Date(start);
  if (unit === 'day') end.setUTCDate(end.getUTCDate() + 1);
  else if (unit === 'month') end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCFullYear(end.getUTCFullYear() + 1);
  return { gte: start, lt: end };
}

/** One phrase, OR across all persisted fields of the create/edit form. */
export function buildIncomingControlSearch(value: unknown): Prisma.SamplingTestWhereInput | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const search = value.trim();
  // PostgreSQL LIKE wildcards must be treated as literal user input.
  const text = {
    contains: search.replace(/[\\%_]/g, '\\$&'),
    mode: 'insensitive' as const,
  };
  const OR: Prisma.SamplingTestWhereInput[] = [
    { plp: { name: text } },
    { testLocation: { testObject: { name: text } } },
    { testLocation: { name: text } },
    { inspector: { name: text } },
    { samplingActNumber: text },
    { samplingDocumentPath: text },
    { note: text },
    { receiptMaterial: { material: { name: text } } },
    { receiptMaterial: { manufacturer: { name: text } } },
    { receiptMaterial: { qualityDocumentNumber: text } },
    { receiptMaterial: { qualityDocumentPath: text } },
    { receiptMaterial: { note: text } },
    { testProtocol: { protocolNumber: text } },
    { testProtocol: { protocolDocumentPath: text } },
    { testProtocol: { testResult: text } },
    { testProtocol: { note: text } },
  ];

  const date = parseRegistrySearchDateRange(search);
  if (date) {
    OR.push(
      { samplingDate: date },
      { receiptMaterial: { receiptDate: date } },
      { receiptMaterial: { qualityDocumentDate: date } },
      { testProtocol: { protocolDate: date } },
    );
  }

  return { OR };
}
