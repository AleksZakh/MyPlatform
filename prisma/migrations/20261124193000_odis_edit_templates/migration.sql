BEGIN;
ALTER TABLE odis.template
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN deleted_at timestamptz;
ALTER TABLE odis.template DROP CONSTRAINT template_category_name_key;
CREATE UNIQUE INDEX template_active_category_name ON odis.template(category,name) WHERE deleted_at IS NULL;
COMMIT;
