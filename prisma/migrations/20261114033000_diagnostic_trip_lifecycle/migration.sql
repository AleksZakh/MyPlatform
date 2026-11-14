BEGIN;
-- AlterTable
ALTER TABLE "diagnostic_trips" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" INTEGER,
ADD COLUMN     "previousNumber" VARCHAR(200);

-- AlterTable
ALTER TABLE "diagnostic_trip_participants" ADD COLUMN     "factHours" DECIMAL(14,4);

-- CreateTable
CREATE TABLE "diagnostic_trip_emails" (
    "id" SERIAL NOT NULL,
    "tripId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "tripVersion" INTEGER NOT NULL,
    "contentKey" VARCHAR(64) NOT NULL,
    "email" VARCHAR(255),
    "subject" VARCHAR(300) NOT NULL,
    "body" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" VARCHAR(500),
    "messageId" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "diagnostic_trip_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diagnostic_trip_emails_status_createdAt_idx" ON "diagnostic_trip_emails"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_trip_emails_tripId_tripVersion_userId_key" ON "diagnostic_trip_emails"("tripId", "tripVersion", "userId");

-- AddForeignKey
ALTER TABLE "diagnostic_trip_emails" ADD CONSTRAINT "diagnostic_trip_emails_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "diagnostic_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_trip_emails" ADD CONSTRAINT "diagnostic_trip_emails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "diagnostic_trip_participants" ADD CONSTRAINT "trip_participant_hours_nonnegative" CHECK ("factHours" IS NULL OR "factHours" >= 0);
-- Preserve old erroneous native labels, leave imported numbers unchanged.
DO $$
DECLARE last_number BIGINT; r RECORD;
BEGIN
 SELECT COALESCE(MAX(substring(n from 3)::bigint),0) INTO last_number FROM (
  SELECT "number" AS n FROM "diagnostic_trips" UNION ALL SELECT "sourceNumber" FROM "diagnostic_trip_origins"
 ) t WHERE n ~ '^[КK]-[0-9]{1,9}$';
 FOR r IN SELECT t.id,t.number FROM "diagnostic_trips" t WHERE t.number ~ '^[КK]-S[0-9]+$'
  AND NOT EXISTS (SELECT 1 FROM "diagnostic_trip_origins" o WHERE o."tripId"=t.id) ORDER BY t."createdAt",t.id LOOP
  last_number:=last_number+1;
  UPDATE "diagnostic_trips" SET "previousNumber"=r.number,"number"='К-'||lpad(last_number::text,GREATEST(4,length(last_number::text)),'0'),"version"="version"+1,"updatedAt"=CURRENT_TIMESTAMP WHERE id=r.id;
 END LOOP;
END $$;
-- Correct planned native one-day assignments; never overwrite completed/factual/imported work.
UPDATE "diagnostic_structure_works" w SET "workId"=c.id,"workCodeSnapshot"=c.code,"workNameSnapshot"=c.name,"criteriaSnapshot"=c.criteria,"catalogHoursSnapshot"=c.hours,"version"=w.version+1,"updatedAt"=CURRENT_TIMESTAMP
 FROM "diagnostic_trips" t,"diagnostic_works" c
 WHERE w."tripId"=t.id AND t.start=t.finish AND w."workCodeSnapshot"='301' AND w.status='planned'
 AND w."deletedAt" IS NULL AND w."factStart" IS NULL AND w."factFinish" IS NULL AND w."factHours" IS NULL AND w."factExecutor"=''
 AND c.code='302' AND lower(trim(c.name))='однодневный выезд' AND c."deletedAt" IS NULL
 AND NOT EXISTS (SELECT 1 FROM "diagnostic_trip_origins" o WHERE o."tripId"=t.id);

COMMIT;
