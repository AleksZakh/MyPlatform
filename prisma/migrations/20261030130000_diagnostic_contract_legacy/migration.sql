CREATE TABLE "diagnostic_contract_legacy_rows" (
 "legacyId" INTEGER PRIMARY KEY,
 "contractId" INTEGER NOT NULL UNIQUE REFERENCES "diagnostic_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "sourceHash" VARCHAR(64) NOT NULL,
 "rawData" JSONB NOT NULL,
 "supervisorText" TEXT NOT NULL DEFAULT '',
 "relatedText" TEXT NOT NULL DEFAULT '',
 "expectedStructures" INTEGER,
 "workCount" INTEGER,
 "importedById" INTEGER NOT NULL,
 "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
