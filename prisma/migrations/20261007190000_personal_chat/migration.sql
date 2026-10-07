CREATE TABLE "chat_conversations" (
 "id" SERIAL PRIMARY KEY, "pairKey" VARCHAR(64) NOT NULL UNIQUE,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "chat_members" (
 "conversationId" INTEGER NOT NULL REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "userId" INTEGER NOT NULL REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "readThrough" INTEGER NOT NULL DEFAULT 0 CHECK ("readThrough" >= 0),
 PRIMARY KEY ("conversationId", "userId")
);
CREATE INDEX "chat_members_userId_conversationId_idx" ON "chat_members"("userId", "conversationId");
CREATE TABLE "chat_messages" (
 "id" SERIAL PRIMARY KEY,
 "conversationId" INTEGER NOT NULL REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "senderId" INTEGER NOT NULL REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "clientId" UUID NOT NULL, "body" VARCHAR(4000) NOT NULL CHECK (length(trim("body")) > 0),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "chat_messages_senderId_clientId_key" UNIQUE ("senderId", "clientId")
);
CREATE INDEX "chat_messages_conversationId_id_idx" ON "chat_messages"("conversationId", "id");
