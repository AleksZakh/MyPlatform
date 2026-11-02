
CREATE TABLE "diagnostic_contract_works" (
 "id" SERIAL PRIMARY KEY, "contractId" INTEGER NOT NULL, "workId" INTEGER NOT NULL,
 "code" VARCHAR(100) NOT NULL, "name" VARCHAR(300) NOT NULL, "criteria" TEXT NOT NULL,
 "planStart" DATE, "planFinish" DATE, "planHours" DECIMAL(14,4), "planExecutor" TEXT NOT NULL DEFAULT '',
 "factStart" DATE, "factFinish" DATE, "factHours" DECIMAL(14,4), "factExecutor" TEXT NOT NULL DEFAULT '',
 "status" VARCHAR(100) NOT NULL, "note" TEXT NOT NULL DEFAULT '',
 "legacyId" INTEGER, "legacyUserWorkId" TEXT, "sourceHash" VARCHAR(64), "rawData" JSONB,
 "version" INTEGER NOT NULL DEFAULT 1, "createdById" INTEGER NOT NULL, "updatedById" INTEGER NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 "deletedAt" TIMESTAMP(3), "deletedById" INTEGER,
 CONSTRAINT "dcw_contract_fk" FOREIGN KEY ("contractId") REFERENCES "diagnostic_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "dcw_work_fk" FOREIGN KEY ("workId") REFERENCES "diagnostic_works"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "dcw_plan_dates" CHECK ("planStart" IS NULL OR "planFinish" IS NULL OR "planFinish">="planStart"),
 CONSTRAINT "dcw_fact_dates" CHECK ("factStart" IS NULL OR "factFinish" IS NULL OR "factFinish">="factStart"),
 CONSTRAINT "dcw_hours" CHECK (("planHours" IS NULL OR "planHours">=0) AND ("factHours" IS NULL OR "factHours">=0))
);
CREATE UNIQUE INDEX "diagnostic_contract_works_legacyId_key" ON "diagnostic_contract_works"("legacyId");
CREATE INDEX "diagnostic_contract_works_contractId_deletedAt_idx" ON "diagnostic_contract_works"("contractId","deletedAt");
CREATE INDEX "diagnostic_contract_works_workId_idx" ON "diagnostic_contract_works"("workId");
