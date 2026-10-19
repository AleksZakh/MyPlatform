BEGIN;
-- Additive migration: existing projects retain their department and visibility.
ALTER TABLE "work_projects" ADD COLUMN "groupId" INTEGER;
ALTER TABLE "work_projects" ADD CONSTRAINT "work_projects_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "space_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "work_projects_groupId_archivedAt_idx" ON "work_projects"("groupId", "archivedAt");
ALTER TABLE "work_projects" ADD CONSTRAINT "work_projects_affiliation_check" CHECK (
  ("groupId" IS NULL OR "departmentId" IS NULL)
  AND ("scope" <> 'GROUP' OR "groupId" IS NOT NULL)
  AND ("scope" <> 'DEPARTMENT' OR "departmentId" IS NOT NULL)
  AND ("scope" <> 'PRIVATE' OR ("groupId" IS NULL AND "departmentId" IS NULL))
);
ALTER TABLE "work_projects" DROP CONSTRAINT "work_project_scope";
ALTER TABLE "work_projects" ADD CONSTRAINT "work_project_scope" CHECK ("scope" IN ('PRIVATE','TEAM','DEPARTMENT','GROUP'));
COMMIT;
