ALTER TABLE "space_groups" ADD COLUMN "storagePath" VARCHAR(240);
-- Preserve module paths for the corresponding Space groups, not AD departments.
WITH candidates AS (
 SELECT id, CASE lower(trim(name))
  WHEN 'лаборанты' THEN 'lab' WHEN 'лабораторный контроль' THEN 'lab' WHEN 'лаборатория' THEN 'lab'
  WHEN 'диагносты' THEN 'diagnostic' WHEN 'диагностика' THEN 'diagnostic' WHEN 'одис' THEN 'diagnostic'
  WHEN 'upts' THEN 'upts' WHEN 'уптс' THEN 'upts' WHEN 'управление подготовки территории строительства' THEN 'upts'
 END AS root FROM "space_groups"
), ranked AS (SELECT id, root, row_number() OVER (PARTITION BY root ORDER BY id) AS n FROM candidates)
UPDATE "space_groups" g SET "storagePath" = CASE WHEN r.root IS NOT NULL AND r.n=1 THEN r.root ELSE 'groups/' || g.id END FROM ranked r WHERE g.id=r.id;
CREATE UNIQUE INDEX "space_groups_storagePath_key" ON "space_groups"("storagePath");
