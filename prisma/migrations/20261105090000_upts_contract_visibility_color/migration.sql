BEGIN;
ALTER TABLE "upts_contracts" ADD COLUMN "color" VARCHAR(7);
ALTER TABLE "upts_contracts" ADD CONSTRAINT "upts_contract_color" CHECK ("color" IS NULL OR "color" ~ '^#[0-9a-fA-F]{6}$');
ALTER TABLE "work_projects" DROP CONSTRAINT "work_project_scope";
ALTER TABLE "work_projects" ADD CONSTRAINT "work_project_scope" CHECK ("scope" IN ('PRIVATE','TEAM','DEPARTMENT','GROUP','UPTS_DEPARTMENT','UPTS_ALL'));
COMMIT;
