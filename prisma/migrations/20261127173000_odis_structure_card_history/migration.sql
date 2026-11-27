BEGIN;
-- Prevent a writer from falling between the historical import and trigger installation.
LOCK TABLE diagnostic_structures IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE diagnostic_structure_history (
  id serial PRIMARY KEY,
  "structureId" integer NOT NULL REFERENCES diagnostic_structures(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "occurredAt" timestamp(3) NOT NULL,
  "actorId" integer,
  "actorLabel" text,
  action text NOT NULL,
  source text,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX diagnostic_structure_history_lookup ON diagnostic_structure_history ("structureId", id);

-- One display value per field. Location and length also have derived numeric columns.
CREATE FUNCTION odis_structure_card_values(r diagnostic_structures) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_build_object('code',r.code,'roadName',r."roadName",'location',r.location,
   'structureName',r."structureName",'issoType',r."issoType",'additionalId',r."additionalId",
   'placementType',r."placementType",'management',r.management,'region',r.region,'district',r.district,
   'obstacleType',r."obstacleType",'obstacleName',r."obstacleName",
   'lengthRaw',coalesce(nullif(r."lengthRaw",''),r."lengthMetres"::text,''),
   'conditionRating',r."conditionRating",'classAk',r."classAk",'classNk',r."classNk",
   'classEnz',r."classEnz",'operator',r.operator,'commissionedYear',r."commissionedYear",
   'expertOpinion',r."expertOpinion",'plannedWorks',r."plannedWorks",'note',r.note)
$$;
CREATE FUNCTION odis_structure_delta(previous jsonb, current_values jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
 SELECT coalesce(jsonb_object_agg(k, jsonb_build_object('before',previous->k,'after',v)), '{}'::jsonb)
 FROM jsonb_each(current_values) AS item(k,v)
 WHERE previous->k IS DISTINCT FROM v
   AND (previous ? k OR v NOT IN ('""'::jsonb,'null'::jsonb))
$$;
CREATE FUNCTION odis_structure_record_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE diff jsonb; imported boolean; operation text;
BEGIN
 IF TG_OP='INSERT' THEN
   diff := odis_structure_delta('{}',odis_structure_card_values(NEW));
   imported := NEW."lastImportedAt" IS NOT NULL;
   operation := 'CREATE';
 ELSE
   diff := odis_structure_delta(odis_structure_card_values(OLD),odis_structure_card_values(NEW));
   imported := NEW."lastImportedAt" IS NOT NULL AND NEW."lastImportedAt" IS DISTINCT FROM OLD."lastImportedAt";
   IF OLD."decommissionedAt" IS DISTINCT FROM NEW."decommissionedAt" THEN
     diff := diff || jsonb_build_object('status',jsonb_build_object(
       'before',CASE WHEN OLD."decommissionedAt" IS NULL THEN 'В эксплуатации' ELSE 'Выведено из эксплуатации' END,
       'after',CASE WHEN NEW."decommissionedAt" IS NULL THEN 'В эксплуатации' ELSE 'Выведено из эксплуатации' END));
   END IF;
   IF diff='{}' AND NOT imported THEN RETURN NULL; END IF;
   operation := CASE WHEN imported THEN 'IMPORT' ELSE 'UPDATE' END;
 END IF;
 INSERT INTO diagnostic_structure_history ("structureId","occurredAt","actorId",action,source,changes)
 VALUES (NEW.id, timezone('UTC',clock_timestamp()), NEW."updatedById", operation,
         CASE WHEN imported THEN NEW."lastImportFile" END,diff);
 RETURN NULL;
END $$;

-- Import only evidence recorded by earlier releases. A timestamp alone supplies no field values.
WITH events AS (
  SELECT a."entityId" AS sid,a.timestamp AS t,a."actorUserId" AS uid,
    coalesce(a."actorLogin",nullif(a."actorEmail",'anonymous')) AS label,
    a.action,a.note AS source,
    CASE WHEN jsonb_typeof(a.changes)='object' THEN a.changes
         WHEN jsonb_typeof(a."afterData")='object' AND
              (jsonb_typeof(a."beforeData")='object' OR a.action='CREATE') THEN
           odis_structure_delta(CASE WHEN jsonb_typeof(a."beforeData")='object' THEN a."beforeData" ELSE '{}' END,a."afterData")
         ELSE '{}' END AS diff, a.id AS sort_id
  FROM audit_logs a JOIN diagnostic_structures s ON s.id=a."entityId"
  WHERE a."entityType"='DiagnosticStructure' AND a.action IN ('CREATE','UPDATE','DELETE')
    AND (a.result='SUCCESS' OR a.result IS NULL) AND (a.category='DATA' OR a.category IS NULL)
), stamps AS (
  SELECT s.id AS sid,s."createdAt" AS t,s."createdById" AS uid,'CREATE' AS action,NULL::text AS source
  FROM diagnostic_structures s WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.sid=s.id AND e.action='CREATE')
  UNION ALL
  SELECT id,"lastImportedAt","lastImportedById",'IMPORT',"lastImportFile" FROM diagnostic_structures WHERE "lastImportedAt" IS NOT NULL
  UNION ALL
  SELECT DISTINCT "structureId","importedAt","importedById",'IMPORT','dis_build' FROM diagnostic_structure_legacy_rows
  UNION ALL
  SELECT id,"updatedAt","updatedById",'UPDATE',NULL FROM diagnostic_structures
  WHERE version>1 AND "updatedAt" IS DISTINCT FROM "createdAt"
    AND ("lastImportedAt" IS NULL OR abs(extract(epoch FROM ("updatedAt"-"lastImportedAt"))) > 1)
), timeline AS (
  SELECT sid,t,uid,label,action,source,diff,sort_id FROM events
  UNION ALL
  SELECT s.sid,s.t,s.uid,NULL,s.action,s.source,'{}'::jsonb,0 FROM stamps s
  WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.sid=s.sid AND e.uid IS NOT DISTINCT FROM s.uid
    AND abs(extract(epoch FROM (s.t-e.t)))<=1 AND (s.action=e.action OR
         (s.action='IMPORT' AND s.source IS NOT NULL AND strpos(coalesce(e.source,''),s.source)>0)))
)
INSERT INTO diagnostic_structure_history ("structureId","occurredAt","actorId","actorLabel",action,source,changes)
SELECT sid,t,uid,label,action,source,diff FROM timeline ORDER BY t,sort_id,sid,action;
CREATE TRIGGER diagnostic_structure_record_change AFTER INSERT OR UPDATE ON diagnostic_structures
 FOR EACH ROW EXECUTE FUNCTION odis_structure_record_change();
COMMIT;
