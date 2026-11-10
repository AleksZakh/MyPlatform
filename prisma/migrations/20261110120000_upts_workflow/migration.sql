ALTER TABLE upts_contracts ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE work_project_files ADD COLUMN "taskId" INTEGER REFERENCES work_tasks(id) ON DELETE RESTRICT ON UPDATE CASCADE, ADD COLUMN "documentType" VARCHAR(100);
CREATE INDEX "work_project_files_taskId_deletedAt_idx" ON work_project_files("taskId", "deletedAt");
CREATE TABLE upts_notifications (
 id UUID PRIMARY KEY, "eventKey" VARCHAR(180) NOT NULL UNIQUE,
 "actorId" INTEGER NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE CASCADE, "recipientId" INTEGER NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "taskId" INTEGER NOT NULL REFERENCES work_tasks(id) ON DELETE RESTRICT ON UPDATE CASCADE, body VARCHAR(3000) NOT NULL,
 "chatSentAt" TIMESTAMP(3), "emailSentAt" TIMESTAMP(3), attempts INTEGER NOT NULL DEFAULT 0,
 "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lockedUntil" TIMESTAMP(3),
 "lastError" VARCHAR(500), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "upts_notifications_nextAttemptAt_idx" ON upts_notifications("nextAttemptAt");
