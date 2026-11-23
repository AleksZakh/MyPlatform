BEGIN;

ALTER TABLE diagnostic_contract_works ADD COLUMN "autoCompleteHours" numeric(12,4);
COMMENT ON COLUMN diagnostic_contract_works."autoCompleteHours" IS 'NULL = ручное закрытие, иначе норматив из библиотеки на дату планирования';
CREATE INDEX odis_contract_work_due ON diagnostic_contract_works
  ((CASE WHEN lower(trim(status)) IN ('planned','scheduled') THEN "planStart" ELSE "planFinish" END), id)
  WHERE "deletedAt" IS NULL AND "factFinish" IS NULL
    AND lower(trim(status)) IN ('planned','scheduled','active','performed','in_progress');

ALTER TABLE diagnostic_structure_works ADD COLUMN "autoCompleteHours" numeric(12,4);
COMMENT ON COLUMN diagnostic_structure_works."autoCompleteHours" IS 'NULL = ручное закрытие, иначе норматив из библиотеки на дату планирования';
CREATE INDEX odis_structure_work_due ON diagnostic_structure_works
  ((CASE WHEN lower(trim(status)) IN ('planned','scheduled') THEN "planStart" ELSE "planFinish" END), id)
  WHERE "deletedAt" IS NULL AND "factFinish" IS NULL
    AND lower(trim(status)) IN ('planned','scheduled','active','performed','in_progress') AND "tripId" IS NULL;

COMMIT;
