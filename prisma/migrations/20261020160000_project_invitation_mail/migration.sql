ALTER TABLE "work_project_invitations"
  ADD COLUMN "emailStatus" VARCHAR(24) NOT NULL DEFAULT 'NOT_REQUESTED',
  ADD COLUMN "emailSentAt" TIMESTAMP(3),
  ADD COLUMN "emailMessageId" VARCHAR(500),
  ADD COLUMN "emailErrorCode" VARCHAR(50);
