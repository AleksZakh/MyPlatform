CREATE TABLE "work_project_files" (
  "id" UUID NOT NULL PRIMARY KEY,
  "clientKey" UUID NOT NULL,
  "projectId" INTEGER NOT NULL,
  "ownerId" INTEGER NOT NULL,
  "scope" VARCHAR(10) NOT NULL,
  "name" VARCHAR(240) NOT NULL,
  "size" INTEGER NOT NULL,
  "sha256" VARCHAR(64) NOT NULL,
  "storageKey" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "work_project_files_scope_check" CHECK ("scope" IN ('SHARED', 'PRIVATE')),
  CONSTRAINT "work_project_files_size_check" CHECK ("size" > 0 AND "size" <= 1073741824),
  CONSTRAINT "work_project_files_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "work_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "work_project_files_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "work_project_files_clientKey_key" ON "work_project_files"("clientKey");
CREATE UNIQUE INDEX "work_project_files_storageKey_key" ON "work_project_files"("storageKey");
CREATE INDEX "work_project_files_projectId_scope_ownerId_deletedAt_createdAt_idx" ON "work_project_files"("projectId", "scope", "ownerId", "deletedAt", "createdAt");
