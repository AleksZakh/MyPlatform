CREATE TABLE "upts_projects" (
 "projectId" INTEGER PRIMARY KEY REFERENCES "work_projects"("id") ON DELETE RESTRICT,
 "projectType" VARCHAR(30) NOT NULL DEFAULT 'LAND', "status" VARCHAR(30) NOT NULL DEFAULT 'INTAKE',
 "basis" VARCHAR(2000) NOT NULL DEFAULT '', "initiator" VARCHAR(200) NOT NULL DEFAULT '',
 "receivedDate" DATE, "completionNote" VARCHAR(2000) NOT NULL DEFAULT '', "isDemo" BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE "upts_objects" (
 "id" SERIAL PRIMARY KEY, "clientKey" UUID NOT NULL UNIQUE, "name" VARCHAR(250) NOT NULL, "cadastralNumber" VARCHAR(100),
 "address" VARCHAR(1000) NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "upts_objects_cadastralNumber_key" ON "upts_objects"("cadastralNumber");
CREATE TABLE "upts_project_objects" (
 "id" SERIAL PRIMARY KEY, "projectId" INTEGER NOT NULL REFERENCES "upts_projects"("projectId") ON DELETE RESTRICT,
 "objectId" INTEGER NOT NULL REFERENCES "upts_objects"("id") ON DELETE RESTRICT,
 "goal" VARCHAR(1000) NOT NULL DEFAULT '', "cadastral" VARCHAR(20) NOT NULL DEFAULT 'TODO',
 "rights" VARCHAR(20) NOT NULL DEFAULT 'TODO', "restrictions" VARCHAR(20) NOT NULL DEFAULT 'TODO',
 "documents" VARCHAR(20) NOT NULL DEFAULT 'TODO', "handover" VARCHAR(20) NOT NULL DEFAULT 'TODO',
 "note" VARCHAR(2000) NOT NULL DEFAULT '', "version" INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX "upts_project_objects_projectId_objectId_key" ON "upts_project_objects"("projectId", "objectId");
CREATE TABLE "upts_contracts" (
 "id" SERIAL PRIMARY KEY, "clientKey" UUID NOT NULL UNIQUE,
 "projectId" INTEGER NOT NULL REFERENCES "upts_projects"("projectId") ON DELETE RESTRICT,
 "number" VARCHAR(100) NOT NULL, "name" VARCHAR(250) NOT NULL, "counterparty" VARCHAR(250) NOT NULL DEFAULT '',
 "signedDate" DATE, "dueDate" DATE, "version" INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX "upts_contracts_projectId_idx" ON "upts_contracts"("projectId");
ALTER TABLE "work_tasks" ADD COLUMN "uptsObjectId" INTEGER REFERENCES "upts_project_objects"("id") ON DELETE RESTRICT;
CREATE INDEX "work_tasks_uptsObjectId_idx" ON "work_tasks"("uptsObjectId");
ALTER TABLE "work_project_files" ADD COLUMN "contractId" INTEGER REFERENCES "upts_contracts"("id") ON DELETE RESTRICT;
CREATE INDEX "work_project_files_contractId_idx" ON "work_project_files"("contractId");
