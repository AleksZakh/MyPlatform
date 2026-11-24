BEGIN;
CREATE SCHEMA IF NOT EXISTS odis;
CREATE TABLE odis.template (
  id serial PRIMARY KEY, name text NOT NULL, category text NOT NULL CHECK(category IN ('contract','structure','other')),
  creator integer NOT NULL REFERENCES app_users(id), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category,name)
);
CREATE TABLE odis.template_item (
  template_id integer REFERENCES odis.template(id) ON DELETE CASCADE,
  work_id integer REFERENCES diagnostic_works(id) ON DELETE RESTRICT,
  PRIMARY KEY(template_id,work_id)
);
CREATE TABLE odis.assignment_owner (
  kind text NOT NULL, work_id integer NOT NULL, employee integer NOT NULL REFERENCES app_users(id),
  planner integer NOT NULL REFERENCES app_users(id), assigned_version integer NOT NULL, PRIMARY KEY(kind,work_id)
);
CREATE TABLE odis.mail (
  id serial PRIMARY KEY, kind text NOT NULL, work_id integer NOT NULL, employee integer NOT NULL,
  reason text NOT NULL CHECK(reason IN ('assigned','due')), token text NOT NULL,
  state text NOT NULL DEFAULT 'pending', available_at timestamptz NOT NULL DEFAULT now(), changed_at timestamptz NOT NULL DEFAULT now(), detail text,
  UNIQUE(kind,work_id,employee,reason,token)
);
CREATE INDEX odis_mail_pending ON odis.mail(available_at,id) WHERE state='pending';
CREATE INDEX odis_cw_due ON diagnostic_contract_works("planFinish",id) WHERE "deletedAt" IS NULL AND "autoCompleteHours" IS NULL AND "factFinish" IS NULL;
CREATE INDEX odis_sw_due ON diagnostic_structure_works("planFinish",id) WHERE "deletedAt" IS NULL AND "autoCompleteHours" IS NULL AND "factFinish" IS NULL AND "tripId" IS NULL;

CREATE VIEW odis.live_assignment AS
SELECT 'contract'::text kind,w.id,w.name,c.number,w.status,w."planExecutor" executor,w."planStart" start_day,
 w."planFinish" finish,w."autoCompleteHours" IS NOT NULL automatic,w."factFinish" fact_finish
FROM diagnostic_contract_works w JOIN diagnostic_contracts c ON c.id=w."contractId"
WHERE w."deletedAt" IS NULL AND c."deletedAt" IS NULL
 AND NOT EXISTS(SELECT 1 FROM diagnostic_trip_completions x WHERE x."contractWorkId"=w.id)
UNION ALL
SELECT 'structure',w.id,w."workNameSnapshot",c.number,w.status,w."planExecutor",w."planStart",w."planFinish",
 w."autoCompleteHours" IS NOT NULL,w."factFinish"
FROM diagnostic_structure_works w JOIN diagnostic_contract_structures l ON l.id=w."contractStructureId"
 JOIN diagnostic_contracts c ON c.id=l."contractId" JOIN diagnostic_structures s ON s.id=l."structureId"
WHERE w."deletedAt" IS NULL AND w."tripId" IS NULL AND l."deletedAt" IS NULL AND s."deletedAt" IS NULL AND c."deletedAt" IS NULL
 AND NOT EXISTS(SELECT 1 FROM diagnostic_trip_completions x WHERE x."structureWorkId"=w.id);

CREATE FUNCTION odis.on_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  employee_id integer := nullif(current_setting('odis.employee',true),'')::int;
  kind text := TG_ARGV[0];
  entity text := TG_ARGV[1];
  label text;
  changed_owner boolean;
BEGIN
  changed_owner := TG_OP='INSERT' OR NEW."planExecutor" IS DISTINCT FROM OLD."planExecutor";
  IF changed_owner THEN
    DELETE FROM odis.assignment_owner a WHERE a.kind=TG_ARGV[0] AND a.work_id=NEW.id;
  END IF;
  IF employee_id IS NOT NULL AND NEW."planExecutor"<>'' AND
     (changed_owner OR OLD."planStart" IS NULL AND NEW."planStart" IS NOT NULL AND
      NOT EXISTS(SELECT 1 FROM odis.assignment_owner a WHERE a.kind=TG_ARGV[0] AND a.work_id=NEW.id)) THEN
    INSERT INTO odis.assignment_owner VALUES(kind,NEW.id,employee_id,NEW."updatedById",NEW.version)
    ON CONFLICT ON CONSTRAINT assignment_owner_pkey DO UPDATE SET employee=excluded.employee,planner=excluded.planner,assigned_version=excluded.assigned_version;
    IF NEW."factFinish" IS NULL AND NEW.status IN ('planned','in_progress','overdue','scheduled') THEN
      INSERT INTO odis.mail(kind,work_id,employee,reason,token) VALUES(kind,NEW.id,employee_id,'assigned',NEW.version::text)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    IF TG_ARGV[0]='contract' THEN label:=NEW.name; ELSE label:=NEW."workNameSnapshot"; END IF;
    INSERT INTO audit_logs("entityType","entityId",action,category,result,"resourceKey","actorUserId","actorEmail",note,"afterData")
    VALUES(entity,NEW.id,CASE WHEN TG_OP='INSERT' THEN 'CREATE' ELSE 'STATUS' END,'DATA','SUCCESS','diagnostic.contracts',
      CASE WHEN current_setting('odis.system',true)='1' THEN NULL ELSE NEW."updatedById" END,'',label,
      jsonb_build_object('status',NEW.status,'previous',OLD.status,'executor',NEW."planExecutor"));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER odis_contract_assignment AFTER INSERT OR UPDATE ON diagnostic_contract_works
 FOR EACH ROW EXECUTE FUNCTION odis.on_assignment('contract','DiagnosticContractWork');
CREATE TRIGGER odis_structure_assignment AFTER INSERT OR UPDATE ON diagnostic_structure_works
 FOR EACH ROW EXECUTE FUNCTION odis.on_assignment('structure','DiagnosticStructureWork');
COMMIT;
