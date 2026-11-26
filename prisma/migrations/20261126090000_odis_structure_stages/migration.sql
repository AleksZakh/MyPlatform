BEGIN;

ALTER TABLE diagnostic_contracts ALTER COLUMN stages SET DEFAULT 1;
UPDATE diagnostic_contracts SET stages = 1 WHERE stages IS NULL OR stages < 1;
ALTER TABLE diagnostic_contracts
  ALTER COLUMN stages SET NOT NULL,
  ADD CONSTRAINT diagnostic_contract_stages_positive CHECK (stages >= 1);

ALTER TABLE diagnostic_contract_structures
  ADD COLUMN stage integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT diagnostic_contract_structure_stage_positive CHECK (stage >= 1);

COMMIT;
