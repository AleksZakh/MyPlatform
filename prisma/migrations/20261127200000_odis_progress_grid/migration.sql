BEGIN;
ALTER TABLE diagnostic_contract_structures
  ADD COLUMN "worklogCrewEdited" boolean NOT NULL DEFAULT false,
  ADD COLUMN "progressOrder" integer,
  ADD COLUMN "sheetOrdinal" text,
  ADD COLUMN "specNumber" text,
  ADD COLUMN "picket" text;

-- Only rows bound to a confirmed structure during the historical import.
WITH latest AS (
  SELECT DISTINCT ON (f."contractId", (r->>'structureId')::integer)
    f."contractId", (r->>'structureId')::integer AS sid,
    (r->>'row')::integer AS position, r->'origin' AS cells
  FROM diagnostic_worklog_files f
  CROSS JOIN LATERAL jsonb_array_elements(f.rows) r
  WHERE jsonb_typeof(r->'structureId')='number' AND jsonb_typeof(r->'row')='number'
  ORDER BY f."contractId", (r->>'structureId')::integer, f."importedAt" DESC, f.hash DESC
)
UPDATE diagnostic_contract_structures l
SET "progressOrder"=x.position, "sheetOrdinal"=coalesce(x.cells->>0,''),
    "specNumber"=coalesce(x.cells->>1,''), picket=coalesce(x.cells->>5,'')
FROM latest x WHERE l."contractId"=x."contractId" AND l."structureId"=x.sid;
COMMIT;
