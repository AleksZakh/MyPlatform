ALTER TABLE upts_contracts ADD COLUMN "storageFolder" VARCHAR(240);
CREATE UNIQUE INDEX upts_contracts_storage_folder_key ON upts_contracts("storageFolder");
ALTER TABLE work_project_files ADD COLUMN "storagePath" VARCHAR(1000), ADD COLUMN "documentDate" DATE, ADD COLUMN "documentComment" VARCHAR(500) NOT NULL DEFAULT '';
CREATE UNIQUE INDEX work_project_files_storage_path_key ON work_project_files("storagePath");
UPDATE upts_work_definitions SET "expectedResult"='№ КУВД + выписка',version=version+1 WHERE name='Регистрация договора аренды' AND "expectedResult"='№ КУВД';
UPDATE work_tasks SET "uptsWorkMeta"=jsonb_set("uptsWorkMeta",'{expectedResult}','"№ КУВД + выписка"'::jsonb),version=version+1 WHERE "uptsContractId" IS NOT NULL AND title='Регистрация договора аренды' AND "uptsWorkMeta"->>'expectedResult'='№ КУВД';
