BEGIN;
ALTER TABLE diagnostic_worklog_files ADD COLUMN "sourceKey" text NOT NULL DEFAULT '';
UPDATE diagnostic_worklog_files f SET "sourceKey"=b."sourceName"
FROM diagnostic_worklog_books b WHERE b."contractId"=f."contractId";
CREATE INDEX diagnostic_worklog_file_source ON diagnostic_worklog_files ("contractId","sourceKey","importedAt");
ALTER TABLE diagnostic_contract_structures ADD COLUMN "worklogCrew" text;
ALTER TABLE diagnostic_trip_structures ADD COLUMN "confirmedById" integer, ADD COLUMN "confirmedAt" timestamp(3);
ALTER TABLE diagnostic_works ADD COLUMN "reportPart" text NOT NULL DEFAULT '';
UPDATE diagnostic_works SET "reportPart"=CASE code
 WHEN '301' THEN 'visit' WHEN '302' THEN 'visit'
 WHEN '309' THEN 'lift' WHEN '310' THEN 'strengthEntry' WHEN '305' THEN 'construction' END
WHERE code IN ('301','302','309','310','305');
UPDATE diagnostic_works SET "reportPart"='survey', "fieldWork"=true
 WHERE lower(trim(name)) IN ('геодезия','полевая геодезия','геодезические измерения');
UPDATE diagnostic_works SET "reportPart"='defects', "fieldWork"=true
 WHERE lower(trim(name)) IN ('дефекты','фиксация дефектов','выявление дефектов','полевая ведомость дефектов');
DO $$
DECLARE category_id int; seq int;
BEGIN
 SELECT id INTO category_id FROM diagnostic_work_categories WHERE "groupId"=3 AND lower(trim(name))='работы по сооружению';
 IF category_id IS NULL THEN RAISE EXCEPTION 'В библиотеке ОДИС отсутствует категория работ по сооружению группы 3'; END IF;
 IF NOT EXISTS (SELECT 1 FROM diagnostic_works WHERE lower(trim(name))='измерение прочности бетона' AND "deletedAt" IS NULL) THEN
   UPDATE diagnostic_work_groups SET "nextSequence"=greatest("nextSequence",1+(SELECT coalesce(max(sequence),0) FROM diagnostic_works WHERE "groupId"=3))+1 WHERE id=3 RETURNING "nextSequence"-1 INTO seq;
   INSERT INTO diagnostic_works(code,"groupId",sequence,"categoryId",name,hours,criteria,note,"fieldWork","reportPart","createdById","updatedById","updatedAt")
   VALUES(CASE WHEN seq<=99 THEN (300+seq)::text ELSE '300.'||(seq-99)::text END,3,seq,category_id,'Измерение прочности бетона',0,'Результаты измерения прочности бетона зафиксированы','Норматив трудоёмкости требует уточнения.',true,'strengthMeasurement',0,0,CURRENT_TIMESTAMP);
 ELSE
   UPDATE diagnostic_works SET "reportPart"='strengthMeasurement',"fieldWork"=true WHERE lower(trim(name))='измерение прочности бетона' AND "deletedAt" IS NULL;
 END IF;
END $$;
COMMIT;
