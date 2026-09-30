import type { Prisma } from '@prisma/client';
import { getCookie, type H3Event } from 'h3';

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}


export function readRegistryFilters(event: H3Event): Record<string, unknown> {
  const raw = getCookie(event, 'lab_reestrTable_filter');
  if (!raw) return {};
  try {
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { parsed = JSON.parse(decodeURIComponent(raw)); }
    const filter = (parsed as { filter?: unknown })?.filter;
    return filter && typeof filter === 'object' && !Array.isArray(filter)
      ? filter as Record<string, unknown> : {};
  } catch { return {}; }
}

export function buildRegistryFilter(cookieFilters: Record<string, unknown>): Prisma.SamplingTestWhereInput {
  const AND: Prisma.SamplingTestWhereInput[] = [{ deletedAt: null }];
    // ПЛП
    if (cookieFilters.plp) {
      AND.push({
        plp: {
          name: {
            contains: String(cookieFilters.plp),
            mode: 'insensitive',
          },
        },
      });
    }


    // Объект
    if (cookieFilters.objName) {
      AND.push({
        testLocation: {
          testObject: {
            name: {
              contains: String(cookieFilters.objName),
              mode: 'insensitive',
            },
          },
        },
      });
    }


    // Номер акта отбора проб
    if (cookieFilters.samplActNumber) {
      AND.push({
        samplingActNumber: {
          contains: String(cookieFilters.samplActNumber),
          mode: 'insensitive',
        },
      });
    }


    // Место отбора
    if (cookieFilters.sPlace) {
      AND.push({
        testLocation: {
          name: {
            contains: String(cookieFilters.sPlace),
            mode: 'insensitive',
          },
        },
      });
    }


    // Лицо, предоставившее пробу
    if (cookieFilters.sProvaider) {
      AND.push({
        inspector: {
          name: {
            contains: String(cookieFilters.sProvaider),
            mode: 'insensitive',
          },
        },
      });
    }


    // Материал
    if (cookieFilters.materialName) {
      AND.push({
        receiptMaterial: {
          material: {
            name: {
              contains: String(cookieFilters.materialName),
              mode: 'insensitive',
            },
          },
        },
      });
    }


    // Производитель
    if (cookieFilters.manufacturer) {
      AND.push({
        receiptMaterial: {
          manufacturer: {
            name: {
              contains: String(cookieFilters.manufacturer),
              mode: 'insensitive',
            },
          },
        },
      });
    }


    // Номер документа о качестве
    if (cookieFilters.qualiDocNumber) {
      AND.push({
        receiptMaterial: {
          qualityDocumentNumber: {
            contains: String(cookieFilters.qualiDocNumber),
            mode: 'insensitive',
          },
        },
      });
    }


    // Результат испытаний
    if (cookieFilters.testResult) {
      AND.push({
        testProtocol: {
          testResult: {
            contains: String(cookieFilters.testResult),
            mode: 'insensitive',
          },
        },
      });
    }


    // Номер протокола
    if (cookieFilters.testProtocolNumber) {
      AND.push({
        testProtocol: {
          protocolNumber: {
            contains: String(cookieFilters.testProtocolNumber),
            mode: 'insensitive',
          },
        },
      });
    }


    // ============================================================
    // ДАТЫ
    // ============================================================

    const samplingDateStart =
      parseDate(cookieFilters.sDateStart);

    const samplingDateEnd =
      parseDate(cookieFilters.sDateEnd);

    if (samplingDateStart || samplingDateEnd) {
      AND.push({
        samplingDate: {
          ...(samplingDateStart
            ? { gte: samplingDateStart }
            : {}),
          ...(samplingDateEnd
            ? { lte: samplingDateEnd }
            : {}),
        },
      });
    }


    const receiptDateStart =
      parseDate(cookieFilters.receiveDateStart);

    const receiptDateEnd =
      parseDate(cookieFilters.receiveDateEnd);

    if (receiptDateStart || receiptDateEnd) {
      AND.push({
        receiptMaterial: {
          receiptDate: {
            ...(receiptDateStart
              ? { gte: receiptDateStart }
              : {}),
            ...(receiptDateEnd
              ? { lte: receiptDateEnd }
              : {}),
          },
        },
      });
    }


    const qualityDocumentDateStart =
      parseDate(cookieFilters.qualiDateStart);

    const qualityDocumentDateEnd =
      parseDate(cookieFilters.qualiDateEnd);

    if (
      qualityDocumentDateStart ||
      qualityDocumentDateEnd
    ) {
      AND.push({
        receiptMaterial: {
          qualityDocumentDate: {
            ...(qualityDocumentDateStart
              ? { gte: qualityDocumentDateStart }
              : {}),
            ...(qualityDocumentDateEnd
              ? { lte: qualityDocumentDateEnd }
              : {}),
          },
        },
      });
    }


    const protocolDateStart =
      parseDate(cookieFilters.testReportDataStart);

    const protocolDateEnd =
      parseDate(cookieFilters.testReportDataEnd);

    if (protocolDateStart || protocolDateEnd) {
      AND.push({
        testProtocol: {
          protocolDate: {
            ...(protocolDateStart
              ? { gte: protocolDateStart }
              : {}),
            ...(protocolDateEnd
              ? { lte: protocolDateEnd }
              : {}),
          },
        },
      });
    }


  return { AND };
}

export function hasRegistryFilter(filter: Prisma.SamplingTestWhereInput): boolean {
  return Array.isArray(filter.AND) && filter.AND.length > 1;
}

export function describeRegistryFilters(filters: Record<string, unknown>): string[] {
  const labels: Record<string, string> = {
    plp: 'ПЛП', objName: 'Объект', samplActNumber: 'Номер акта', sPlace: 'Место отбора',
    sProvaider: 'Лицо, предоставившее пробу', materialName: 'Материал', manufacturer: 'Изготовитель',
    qualiDocNumber: 'Номер документа о качестве', testResult: 'Результат испытаний', testProtocolNumber: 'Номер протокола',
    sDateStart: 'Дата отбора с', sDateEnd: 'Дата отбора по', receiveDateStart: 'Дата поступления с', receiveDateEnd: 'Дата поступления по',
    qualiDateStart: 'Дата документа о качестве с', qualiDateEnd: 'Дата документа о качестве по',
    testReportDataStart: 'Дата протокола с', testReportDataEnd: 'Дата протокола по',
  };
  return Object.entries(labels).flatMap(([key, label]) => filters[key] ? [`${label}: ${String(filters[key])}`] : []);
}
