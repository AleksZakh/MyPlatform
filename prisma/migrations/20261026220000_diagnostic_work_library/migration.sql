BEGIN;
CREATE TABLE diagnostic_work_groups (
 id INTEGER PRIMARY KEY CHECK (id BETWEEN 1 AND 9),
 name VARCHAR(300) NOT NULL UNIQUE,
 "nextSequence" INTEGER NOT NULL DEFAULT 1 CHECK ("nextSequence" > 0)
);
CREATE TABLE diagnostic_work_categories (
 id SERIAL PRIMARY KEY,
 "groupId" INTEGER NOT NULL REFERENCES diagnostic_work_groups(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 name VARCHAR(250) NOT NULL CHECK (length(trim(name))>0),
 "createdById" INTEGER,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("groupId",name), UNIQUE (id,"groupId")
);
CREATE UNIQUE INDEX diagnostic_work_categories_normalized ON diagnostic_work_categories ("groupId",lower(trim(name)));
CREATE TABLE diagnostic_works (
 id SERIAL PRIMARY KEY,
 "legacyId" INTEGER UNIQUE,
 code VARCHAR(100) NOT NULL UNIQUE,
 "groupId" INTEGER NOT NULL REFERENCES diagnostic_work_groups(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 sequence INTEGER NOT NULL CHECK (sequence>=0),
 "categoryId" INTEGER NOT NULL,
 name VARCHAR(300) NOT NULL CHECK (length(trim(name))>0),
 hours DECIMAL(12,4) NOT NULL CHECK (hours>=0),
 criteria VARCHAR(2000) NOT NULL CHECK (length(trim(criteria))>0),
 note VARCHAR(4000) NOT NULL DEFAULT '',
 version INTEGER NOT NULL DEFAULT 1 CHECK (version>0),
 "createdById" INTEGER NOT NULL,
 "updatedById" INTEGER NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 "deletedAt" TIMESTAMP(3),
 "deletedById" INTEGER,
 "deleteReason" VARCHAR(1000),
 UNIQUE ("groupId",sequence),
 FOREIGN KEY ("categoryId","groupId") REFERENCES diagnostic_work_categories(id,"groupId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CHECK (code = CASE WHEN sequence<=99 THEN ("groupId"*100+sequence)::text ELSE ("groupId"*100)::text||'.'||(sequence-99)::text END),
 CHECK (("deletedAt" IS NULL AND "deletedById" IS NULL AND "deleteReason" IS NULL) OR ("deletedAt" IS NOT NULL AND "deletedById" IS NOT NULL AND "deleteReason" IS NOT NULL AND length(trim("deleteReason"))>0))
);
CREATE INDEX diagnostic_works_deletedAt_groupId_sequence_idx ON diagnostic_works ("deletedAt","groupId",sequence);
INSERT INTO access_resources (key,name,description,type,"isActive","sortOrder","createdAt","updatedAt")
VALUES ('diagnostic.works','Диагностика — библиотека работ','VIEW — просмотр; CREATE — новые работы и категории; UPDATE — изменение; DELETE — мягкое удаление с причиной.','TABLE',true,610,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;
INSERT INTO diagnostic_work_groups (id,name,"nextSequence") VALUES (1,'Доходный договор',48);
INSERT INTO diagnostic_work_categories ("groupId",name) VALUES (1,'Работы по сооружению');
INSERT INTO diagnostic_work_categories ("groupId",name) VALUES (1,'Работы с договором');
INSERT INTO diagnostic_work_groups (id,name,"nextSequence") VALUES (2,'Расходный договор',26);
INSERT INTO diagnostic_work_categories ("groupId",name) VALUES (2,'Работы с договором');
INSERT INTO diagnostic_work_groups (id,name,"nextSequence") VALUES (3,'ОТС сооружения',26);
INSERT INTO diagnostic_work_categories ("groupId",name) VALUES (3,'Работы по сооружению');
INSERT INTO diagnostic_work_groups (id,name,"nextSequence") VALUES (4,'Сопровождение АИС ИССО-Н',10);
INSERT INTO diagnostic_work_categories ("groupId",name) VALUES (4,'Недоговорные работы');
INSERT INTO diagnostic_work_categories ("groupId",name) VALUES (4,'Работы с договором');
INSERT INTO diagnostic_work_groups (id,name,"nextSequence") VALUES (5,'Администрирование программного обеспечения',5);
INSERT INTO diagnostic_work_categories ("groupId",name) VALUES (5,'Недоговорные работы');
INSERT INTO diagnostic_work_groups (id,name,"nextSequence") VALUES (6,'Недоговорные работы',11);
INSERT INTO diagnostic_work_categories ("groupId",name) VALUES (6,'Недоговорные работы');
INSERT INTO diagnostic_work_groups (id,name,"nextSequence") VALUES (7,'Материально-технические средства и транспорт',12);
INSERT INTO diagnostic_work_categories ("groupId",name) VALUES (7,'Недоговорные работы');
INSERT INTO diagnostic_work_groups (id,name,"nextSequence") VALUES (8,'Проекты и финансы',10);
INSERT INTO diagnostic_work_categories ("groupId",name) VALUES (8,'Недоговорные работы');
INSERT INTO diagnostic_work_groups (id,name,"nextSequence") VALUES (9,'Персонал',10);
INSERT INTO diagnostic_work_categories ("groupId",name) VALUES (9,'Недоговорные работы');
INSERT INTO diagnostic_work_categories ("groupId",name) VALUES (9,'Работы по сооружению');
INSERT INTO diagnostic_work_categories ("groupId",name) VALUES (9,'Работы с договором');
COMMIT;
