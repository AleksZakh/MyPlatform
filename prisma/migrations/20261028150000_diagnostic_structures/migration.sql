BEGIN;
-- The current contract directory is empty. Refuse to guess pre-existing placeholder links.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "diagnostic_contract_structures") THEN
    RAISE EXCEPTION 'Existing diagnostic_contract_structures rows need explicit mapping before this migration. No data was changed.';
  END IF;
END $$;
CREATE TABLE "diagnostic_structures" (
  "id" SERIAL PRIMARY KEY,
  "code" VARCHAR(200) NOT NULL UNIQUE CHECK (length(trim("code"))>0),
  "management" TEXT NOT NULL DEFAULT '',
  "structureName" TEXT NOT NULL DEFAULT '',
  "issoType" TEXT NOT NULL DEFAULT '',
  "roadName" TEXT NOT NULL DEFAULT '',
  "location" TEXT NOT NULL DEFAULT '',
  "placementType" TEXT NOT NULL DEFAULT '',
  "additionalId" TEXT NOT NULL DEFAULT '',
  "obstacleType" TEXT NOT NULL DEFAULT '',
  "obstacleName" TEXT NOT NULL DEFAULT '',
  "region" TEXT NOT NULL DEFAULT '',
  "district" TEXT NOT NULL DEFAULT '',
  "operator" TEXT NOT NULL DEFAULT '',
  "commissionedYear" TEXT NOT NULL DEFAULT '',
  "expertOpinion" TEXT NOT NULL DEFAULT '',
  "conditionRating" TEXT NOT NULL DEFAULT '',
  "classAk" TEXT NOT NULL DEFAULT '',
  "classNk" TEXT NOT NULL DEFAULT '',
  "classEnz" TEXT NOT NULL DEFAULT '',
  "lengthRaw" TEXT NOT NULL DEFAULT '',
  "plannedWorks" TEXT NOT NULL DEFAULT '',
  "note" TEXT NOT NULL DEFAULT '',
  "locationMetres" DECIMAL(13,0),
  "lengthMetres" DECIMAL(18,6) CHECK ("lengthMetres" IS NULL OR "lengthMetres">=0),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK (version>0),
  "createdById" INTEGER NOT NULL,"updatedById" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),"deletedById" INTEGER,"deleteReason" TEXT
);
CREATE INDEX "diagnostic_structures_deletedAt_code_idx" ON "diagnostic_structures"("deletedAt","code");
CREATE INDEX "diagnostic_structures_locationMetres_idx" ON "diagnostic_structures"("locationMetres");
CREATE TABLE "diagnostic_structure_legacy_rows" (
  "id" SERIAL PRIMARY KEY,"legacyId" INTEGER NOT NULL UNIQUE,"structureId" INTEGER NOT NULL,
  "sourceHash" VARCHAR(64) NOT NULL,"dumpHash" VARCHAR(64) NOT NULL,"rawData" JSONB NOT NULL,
  "importedById" INTEGER NOT NULL,"importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("structureId") REFERENCES "diagnostic_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "diagnostic_structure_legacy_rows_structureId_idx" ON "diagnostic_structure_legacy_rows"("structureId");
ALTER TABLE "diagnostic_contract_structures" ADD COLUMN "structureId" INTEGER NOT NULL;
ALTER TABLE "diagnostic_contract_structures" ALTER COLUMN "legacyStructureId" DROP NOT NULL;
DROP INDEX "diagnostic_contract_structures_contractId_legacyStructureId_key";
CREATE INDEX "diagnostic_contract_structures_legacyStructureId_idx" ON "diagnostic_contract_structures"("legacyStructureId");
ALTER TABLE "diagnostic_contract_structures" ADD CONSTRAINT "diagnostic_contract_structures_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "diagnostic_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "diagnostic_contract_structures_contractId_structureId_key" ON "diagnostic_contract_structures"("contractId","structureId");
CREATE UNIQUE INDEX "diagnostic_contract_structures_id_structureId_key" ON "diagnostic_contract_structures"("id","structureId");
CREATE TABLE "diagnostic_structure_legacy_contracts" (
  "id" SERIAL PRIMARY KEY,"structureId" INTEGER NOT NULL,"key" VARCHAR(64) NOT NULL,
  "customer" TEXT NOT NULL,"number" TEXT NOT NULL,"dateText" TEXT NOT NULL,"date" DATE,
  "contractStructureId" INTEGER,"linkedById" INTEGER,"linkedAt" TIMESTAMP(3),
  UNIQUE ("structureId","key"),
  FOREIGN KEY ("structureId") REFERENCES "diagnostic_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ds_legacy_contract_link_fk" FOREIGN KEY ("contractStructureId","structureId") REFERENCES "diagnostic_contract_structures"("id","structureId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "diagnostic_structure_legacy_contracts_contractStructureId_idx" ON "diagnostic_structure_legacy_contracts"("contractStructureId");
CREATE TABLE "diagnostic_structure_legacy_executors" (
  "id" SERIAL PRIMARY KEY,"structureId" INTEGER NOT NULL,"key" VARCHAR(64) NOT NULL,"name" TEXT NOT NULL,
  UNIQUE ("structureId","key"),
  FOREIGN KEY ("structureId") REFERENCES "diagnostic_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "diagnostic_structure_works" (
  "id" SERIAL PRIMARY KEY,"contractStructureId" INTEGER NOT NULL,"structureId" INTEGER NOT NULL,"workId" INTEGER NOT NULL,
  "workCodeSnapshot" VARCHAR(100) NOT NULL,"workNameSnapshot" VARCHAR(300) NOT NULL,"criteriaSnapshot" TEXT NOT NULL,
  "catalogHoursSnapshot" DECIMAL(12,4) NOT NULL CHECK ("catalogHoursSnapshot">=0),
  "hours" DECIMAL(12,4) NOT NULL CHECK (hours>=0),"note" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1 CHECK (version>0),"createdById" INTEGER NOT NULL,"updatedById" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),"deletedById" INTEGER,
  CONSTRAINT "ds_work_contract_link_fk" FOREIGN KEY ("contractStructureId","structureId") REFERENCES "diagnostic_contract_structures"("id","structureId") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("workId") REFERENCES "diagnostic_works"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "diagnostic_structure_works_contractStructureId_deletedAt_idx" ON "diagnostic_structure_works"("contractStructureId","deletedAt");
CREATE INDEX "diagnostic_structure_works_workId_idx" ON "diagnostic_structure_works"("workId");
COMMIT;
