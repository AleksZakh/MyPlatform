-- Unknown historical authors are distinct from the operator who imports a row.
-- Existing rows are intentionally not reattributed without reviewing their audit.
ALTER TABLE "diagnostic_contract_works"
 ALTER COLUMN "createdById" DROP NOT NULL,
 ALTER COLUMN "updatedById" DROP NOT NULL,
 ADD COLUMN "importedById" INTEGER,
 ADD COLUMN "importedAt" TIMESTAMP(3);
