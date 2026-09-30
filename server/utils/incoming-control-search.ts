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

  const date = parseRegistrySearchDate(search);
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
