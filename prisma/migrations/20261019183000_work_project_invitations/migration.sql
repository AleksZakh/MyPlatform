CREATE TABLE "work_project_invitations" (
 "id" UUID NOT NULL PRIMARY KEY,
 "projectId" INTEGER NOT NULL REFERENCES "work_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "userId" INTEGER NOT NULL REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "inviterId" INTEGER NOT NULL REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('MANAGER','CURATOR','MEMBER','OBSERVER')),
 "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('SENDING','PENDING','ACCEPTED','DECLINED','CANCELLED','DELIVERY_FAILED')),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "respondedAt" TIMESTAMP(3),
 CONSTRAINT "work_project_invitations_projectId_userId_key" UNIQUE ("projectId","userId")
);
CREATE INDEX "work_project_invitations_userId_status_expiresAt_idx" ON "work_project_invitations"("userId","status","expiresAt");
CREATE INDEX "work_project_invitations_inviterId_createdAt_idx" ON "work_project_invitations"("inviterId","createdAt");
