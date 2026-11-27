BEGIN;
ALTER TABLE diagnostic_structures ALTER COLUMN code DROP NOT NULL,
  ADD COLUMN "importKind" text NOT NULL DEFAULT 'reference',
  ADD COLUMN "lastImportedById" integer,
  ADD COLUMN "lastImportedAt" timestamp(3),
  ADD COLUMN "lastImportFile" text;
UPDATE diagnostic_structures AS s
SET "lastImportedById" = a."actorUserId", "lastImportedAt" = a.timestamp,
    "lastImportFile" = substring(a.note from '^Импорт Excel: (.*), строка [0-9]+, код ')
FROM (
  SELECT DISTINCT ON ("entityId") "entityId", "actorUserId", timestamp, note
  FROM audit_logs
  WHERE "entityType" = 'DiagnosticStructure' AND action = 'CREATE'
    AND result = 'SUCCESS' AND note LIKE 'Импорт Excel: %'
  ORDER BY "entityId", timestamp DESC, id DESC
) AS a WHERE s.id = a."entityId";
CREATE UNIQUE INDEX diagnostic_provisional_structure_identity ON diagnostic_structures
  (lower(regexp_replace(btrim("roadName"), '\s+', ' ', 'g')), (COALESCE("locationMetres"::text, lower(btrim(location)))),
   lower(regexp_replace(btrim("structureName"), '\s+', ' ', 'g')),
   lower(regexp_replace(btrim("additionalId"), '\s+', ' ', 'g')))
  WHERE code IS NULL AND "deletedAt" IS NULL AND "decommissionedAt" IS NULL;
ALTER TABLE diagnostic_works ADD COLUMN "fieldWork" boolean NOT NULL DEFAULT false;
UPDATE diagnostic_works SET "fieldWork" = true WHERE lower(trim(name)) IN ('командировка','однодневный выезд');
CREATE TABLE diagnostic_worklog_books (
  "contractId" integer PRIMARY KEY REFERENCES diagnostic_contracts(id) ON DELETE CASCADE,
  "sourceName" text NOT NULL UNIQUE
);
CREATE TABLE diagnostic_worklog_files (
  hash text PRIMARY KEY,
  "contractId" integer NOT NULL REFERENCES diagnostic_worklog_books("contractId") ON DELETE CASCADE,
  "fileName" text NOT NULL,
  "importedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" integer NOT NULL,
  rows jsonb NOT NULL
);

ALTER TABLE diagnostic_structure_works ADD COLUMN "worklogCell" jsonb;
ALTER TABLE diagnostic_contract_structures ADD COLUMN "worklogActive" boolean;
COMMIT;
