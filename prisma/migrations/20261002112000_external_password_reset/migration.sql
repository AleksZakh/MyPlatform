ALTER TABLE "app_users"
  ADD COLUMN "passwordResetTokenHash" VARCHAR(64),
  ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3),
  ADD COLUMN "passwordResetRequestedAt" TIMESTAMP(3),
  ADD COLUMN "externalSessionVersion" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "app_users_passwordResetTokenHash_key" ON "app_users"("passwordResetTokenHash");
CREATE TABLE "password_reset_limits" (
  "key" VARCHAR(100) PRIMARY KEY,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL
);
CREATE INDEX "password_reset_limits_startedAt_idx" ON "password_reset_limits"("startedAt");
