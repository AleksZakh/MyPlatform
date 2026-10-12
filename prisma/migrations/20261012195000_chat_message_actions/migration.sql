ALTER TABLE "chat_conversations" ADD COLUMN "messageVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "chat_messages" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "editedAt" TIMESTAMP(3), ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "chat_messages_conversationId_revision_idx" ON "chat_messages"("conversationId", "revision");
CREATE TABLE "chat_message_revisions" (
 "id" SERIAL PRIMARY KEY,
 "messageId" INTEGER NOT NULL REFERENCES "chat_messages"("id") ON DELETE CASCADE,
 "actorId" INTEGER NOT NULL,
 "previousBody" VARCHAR(4000) NOT NULL,
 "previousRevision" INTEGER NOT NULL,
 "action" VARCHAR(10) NOT NULL CHECK ("action" IN ('EDIT','DELETE')),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "chat_message_revisions_messageId_previousRevision_key" ON "chat_message_revisions"("messageId", "previousRevision");
CREATE INDEX "chat_message_revisions_actorId_createdAt_idx" ON "chat_message_revisions"("actorId", "createdAt");
