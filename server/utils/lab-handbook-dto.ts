import type { Prisma } from '@prisma/client';

// Legacy handbook forms keep their wire format; Prisma always uses current schema names.
export const receiptHandbookInclude = {
  material: true,
  manufacturer: true,
  samplingTest: { include: { testProtocol: true, plp: true, inspector: true,
    testLocation: { include: { testObject: true } } } },
} satisfies Prisma.ReceiptMaterialInclude;

export const protocolHandbookInclude = {
  samplingTest: { include: { receiptMaterial: { include: { material: true, manufacturer: true } },
    plp: true, inspector: true, testLocation: { include: { testObject: true } } } },
} satisfies Prisma.TestProtocolInclude;

type ReceiptRow = Prisma.ReceiptMaterialGetPayload<{ include: typeof receiptHandbookInclude }>;
type ProtocolRow = Prisma.TestProtocolGetPayload<{ include: typeof protocolHandbookInclude }>;

export function receiptHandbookDto(row: ReceiptRow) {
  const sampling = row.samplingTest;
  const acts = sampling ? [{ ...sampling, sActNumber: sampling.samplingActNumber,
    sActDate: sampling.samplingDate }] : [];
  const protocol = sampling?.testProtocol;
  return {
    ...row,
    // The existing form labels qualDate as "Дата поступления".
    qualDate: row.receiptDate,
    qualDocNumber: row.qualityDocumentNumber,
    qualDocPath: row.qualityDocumentPath,
    material: { ...row.material, manufacturer: row.manufacturer },
    samplingTests: acts,
    testProtocols: protocol ? [{ ...protocol, protocolDocPath: protocol.protocolDocumentPath,
      samplingTests: acts }] : [],
    _count: { testProtocols: protocol ? 1 : 0 },
  };
}

export function protocolHandbookDto(row: ProtocolRow) {
  const sampling = row.samplingTest;
  const receipt = sampling?.receiptMaterial;
  return {
    ...row,
    protocolDocPath: row.protocolDocumentPath,
    receiptMaterial: receipt ? { ...receipt, qualDate: receipt.receiptDate,
      qualDocNumber: receipt.qualityDocumentNumber, qualDocPath: receipt.qualityDocumentPath,
      material: { ...receipt.material, manufacturer: receipt.manufacturer } } : null,
    samplingTests: sampling ? [{ ...sampling, sActNumber: sampling.samplingActNumber,
      sActDate: sampling.samplingDate }] : [],
    _count: { samplingTests: sampling ? 1 : 0 },
  };
}
