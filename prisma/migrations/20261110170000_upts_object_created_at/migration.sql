-- Old objects retain the actual CREATE audit timestamp when available.
-- Unknown historical dates stay NULL instead of becoming the upgrade date.
ALTER TABLE upts_contracts ADD COLUMN "createdAt" TIMESTAMP(3);
UPDATE upts_contracts AS c SET "createdAt"=a.first_created
FROM (SELECT "entityId", MIN("timestamp") AS first_created FROM audit_logs
      WHERE "entityType"='UptsContract' AND action='CREATE' AND result='SUCCESS'
      GROUP BY "entityId") AS a
WHERE c.id=a."entityId";
ALTER TABLE upts_contracts ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
