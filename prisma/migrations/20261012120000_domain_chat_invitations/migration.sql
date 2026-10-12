CREATE TABLE "domain_chat_invitations" (
 "id" UUID NOT NULL PRIMARY KEY,
 "recipientId" INTEGER NOT NULL UNIQUE REFERENCES "app_users"("id") ON DELETE CASCADE,
 "senderId" INTEGER NOT NULL REFERENCES "app_users"("id") ON DELETE RESTRICT,
 "directoryObjectId" VARCHAR(255) NOT NULL,
 "recipientVersion" TIMESTAMP(3) NOT NULL,
 "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "sentAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3)
);
CREATE INDEX "domain_chat_invitations_senderId_reservedAt_idx" ON "domain_chat_invitations"("senderId", "reservedAt");
