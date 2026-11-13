BEGIN;
ALTER TABLE "diagnostic_structure_works"
 ALTER COLUMN "hours" DROP NOT NULL,
 ALTER COLUMN "hours" TYPE DECIMAL(14,4),
 ALTER COLUMN "createdById" DROP NOT NULL,
 ALTER COLUMN "updatedById" DROP NOT NULL,
 ADD COLUMN "planStart" DATE,
 ADD COLUMN "planFinish" DATE,
 ADD COLUMN "planHours" DECIMAL(14,4),
 ADD COLUMN "planExecutor" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "factStart" DATE,
 ADD COLUMN "factFinish" DATE,
 ADD COLUMN "factHours" DECIMAL(14,4),
 ADD COLUMN "factExecutor" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "status" VARCHAR(100) NOT NULL DEFAULT '',
 ADD COLUMN "warning" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "legacyCanonicalId" INTEGER,
 ADD COLUMN "legacyBusinessHash" VARCHAR(64),
 ADD COLUMN "legacyUserWorkId" INTEGER,
 ADD COLUMN "legacySource" JSONB,
 ADD COLUMN "legacyPersonalSource" JSONB,
 ADD COLUMN "importSourceHash" VARCHAR(64),
 ADD COLUMN "importUserSourceHash" VARCHAR(64),
 ADD COLUMN "importedById" INTEGER,
 ADD COLUMN "importedAt" TIMESTAMP(3),
 ADD CONSTRAINT "dsw_plan_hours_nonnegative" CHECK ("planHours" >= 0),
 ADD CONSTRAINT "dsw_fact_hours_nonnegative" CHECK ("factHours" >= 0),
 ADD CONSTRAINT "dsw_plan_dates_order" CHECK ("planStart" <= "planFinish"),
 ADD CONSTRAINT "dsw_fact_dates_order" CHECK ("factStart" <= "factFinish");
CREATE UNIQUE INDEX "diagnostic_structure_works_legacyCanonicalId_key" ON "diagnostic_structure_works"("legacyCanonicalId");
CREATE UNIQUE INDEX "diagnostic_structure_works_legacyBusinessHash_key" ON "diagnostic_structure_works"("legacyBusinessHash");
CREATE TABLE "diagnostic_structure_work_origins" (
 "legacyId" INTEGER PRIMARY KEY,
 "assignmentId" INTEGER NOT NULL,
 "sourceIdRaw" TEXT NOT NULL,
 "sourceCode" VARCHAR(100) NOT NULL,
 "sourceHash" VARCHAR(64) NOT NULL,
 "sourceFileHash" VARCHAR(64) NOT NULL,
 CONSTRAINT "diagnostic_structure_work_origins_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "diagnostic_structure_works"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "diagnostic_structure_work_origins_assignmentId_idx" ON "diagnostic_structure_work_origins"("assignmentId");
COMMIT;
