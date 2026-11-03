ALTER TABLE "upts_contracts" ADD COLUMN "contractType" VARCHAR(20);
ALTER TABLE "upts_contracts" ADD CONSTRAINT "upts_contract_type_check" CHECK ("contractType" IN ('LAND','OKS','ZOUIT','IPE','MARKS','OTHER'));
ALTER TABLE "work_tasks" ADD COLUMN "uptsContractId" INTEGER;
ALTER TABLE "work_tasks" ADD CONSTRAINT "work_tasks_uptsContractId_fkey" FOREIGN KEY ("uptsContractId") REFERENCES "upts_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "work_tasks_uptsContractId_idx" ON "work_tasks"("uptsContractId");
CREATE TABLE "upts_work_definitions" (
 "id" SERIAL PRIMARY KEY, "clientKey" UUID NOT NULL UNIQUE, "name" VARCHAR(250) NOT NULL,
 "contractType" VARCHAR(20) NOT NULL CHECK ("contractType" IN ('LAND','OKS','ZOUIT','IPE','MARKS','OTHER')), "active" BOOLEAN NOT NULL DEFAULT true, "version" INTEGER NOT NULL DEFAULT 1,
 UNIQUE ("contractType", "name")
);
CREATE TABLE "upts_work_templates" (
 "id" SERIAL PRIMARY KEY, "clientKey" UUID NOT NULL UNIQUE, "name" VARCHAR(250) NOT NULL,
 "contractType" VARCHAR(20) NOT NULL CHECK ("contractType" IN ('LAND','OKS','ZOUIT','IPE','MARKS','OTHER')), "active" BOOLEAN NOT NULL DEFAULT true, "version" INTEGER NOT NULL DEFAULT 1,
 UNIQUE ("contractType", "name")
);
CREATE TABLE "upts_work_template_items" (
 "templateId" INTEGER NOT NULL REFERENCES "upts_work_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "workId" INTEGER NOT NULL REFERENCES "upts_work_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "position" INTEGER NOT NULL, PRIMARY KEY ("templateId", "workId"), UNIQUE ("templateId", "position")
);
INSERT INTO "upts_work_templates" ("clientKey","name","contractType") VALUES ('1502f8fa-2ab7-519a-be78-f3eff72d880e','Базовый набор','LAND');
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('a5722d34-272c-5c59-8720-820cc2a45425','Образование из НГС','LAND');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 0 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='LAND' AND w."contractType"='LAND' AND w.name='Образование из НГС';
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('318c45e6-185f-593b-98a4-1824dcc83ccb','Раздел','LAND');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 1 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='LAND' AND w."contractType"='LAND' AND w.name='Раздел';
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('6c938f4b-5168-50c6-b736-0aacb5c0f22d','Учет изменений','LAND');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 2 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='LAND' AND w."contractType"='LAND' AND w.name='Учет изменений';
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('d787c866-b537-5e7e-9939-c69de548b9b2','Регистрация права','LAND');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 3 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='LAND' AND w."contractType"='LAND' AND w.name='Регистрация права';
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('d35f5a54-1115-520d-9d95-46fb7106472a','Изменение ВРИ','LAND');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 4 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='LAND' AND w."contractType"='LAND' AND w.name='Изменение ВРИ';
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('793da01a-3bf9-57c9-87db-e788fe90890a','Техническая ошибка','LAND');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 5 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='LAND' AND w."contractType"='LAND' AND w.name='Техническая ошибка';
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('2ec626b8-fe40-5794-a90a-23f0f6f35bee','Реестровая ошибка','LAND');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 6 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='LAND' AND w."contractType"='LAND' AND w.name='Реестровая ошибка';
INSERT INTO "upts_work_templates" ("clientKey","name","contractType") VALUES ('073fa67c-f078-5707-aa77-124ea498bf1f','Базовый набор','OKS');
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('e991b43b-49f6-540a-8410-95aa965381ea','Образование','OKS');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 0 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='OKS' AND w."contractType"='OKS' AND w.name='Образование';
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('2dff032b-cb9c-54c7-9966-c0c47481229b','Раздел','OKS');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 1 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='OKS' AND w."contractType"='OKS' AND w.name='Раздел';
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('5d82c0d1-aa8e-5c23-986a-daf3db6991aa','Учет изменений','OKS');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 2 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='OKS' AND w."contractType"='OKS' AND w.name='Учет изменений';
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('e785999c-fdb5-57e5-b648-5b234f8a970b','Регистрация права','OKS');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 3 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='OKS' AND w."contractType"='OKS' AND w.name='Регистрация права';
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('13f397c2-c646-5054-9993-17603ef86757','Акт обследования','OKS');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 4 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='OKS' AND w."contractType"='OKS' AND w.name='Акт обследования';
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('a95bbecb-4999-505f-b8bb-afb0c30472ec','Техническая ошибка','OKS');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 5 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='OKS' AND w."contractType"='OKS' AND w.name='Техническая ошибка';
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('614846f5-6170-56fe-a479-13e432d6cff4','Реестровая ошибка','OKS');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 6 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='OKS' AND w."contractType"='OKS' AND w.name='Реестровая ошибка';
INSERT INTO "upts_work_templates" ("clientKey","name","contractType") VALUES ('f47ccce1-69e9-557f-9fd9-091107a5c1e8','Базовый набор','ZOUIT');
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('3267f809-f56b-5032-950f-76db9535dbb7','Установление публичного сервитута','ZOUIT');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 0 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='ZOUIT' AND w."contractType"='ZOUIT' AND w.name='Установление публичного сервитута';
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('52904420-fcc7-5bf4-aa56-39fbb5e6ecb5','Установление ПП','ZOUIT');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 1 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='ZOUIT' AND w."contractType"='ZOUIT' AND w.name='Установление ПП';
INSERT INTO "upts_work_templates" ("clientKey","name","contractType") VALUES ('a8f7468b-0e2d-5dbe-965e-e3c134e17d02','Базовый набор','IPE');
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('b5f5cee0-27cf-5267-9a3f-a0a8eb0559e4','Комплексная оценка территории','IPE');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 0 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='IPE' AND w."contractType"='IPE' AND w.name='Комплексная оценка территории';
INSERT INTO "upts_work_templates" ("clientKey","name","contractType") VALUES ('b41ed799-4bf4-5d6e-9dfe-93cd60ab97c6','Базовый набор','MARKS');
INSERT INTO "upts_work_definitions" ("clientKey","name","contractType") VALUES ('7339a7f1-c503-51f4-859c-3054b555fb1f','Подготовка схемы закрепления точек и каталога координат','MARKS');
INSERT INTO "upts_work_template_items" SELECT t.id, w.id, 0 FROM "upts_work_templates" t, "upts_work_definitions" w WHERE t."contractType"='MARKS' AND w."contractType"='MARKS' AND w.name='Подготовка схемы закрепления точек и каталога координат';
CREATE TABLE "upts_work_applications" (
 "clientKey" UUID PRIMARY KEY, "contractId" INTEGER NOT NULL REFERENCES "upts_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "actorId" INTEGER NOT NULL, "fingerprint" TEXT NOT NULL, "count" INTEGER NOT NULL
);
