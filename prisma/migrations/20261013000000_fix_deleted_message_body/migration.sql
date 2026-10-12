BEGIN;

ALTER TABLE "chat_messages"
  DROP CONSTRAINT "chat_messages_body_check";

ALTER TABLE "chat_messages"
  ADD CONSTRAINT "chat_messages_body_check"
  CHECK (
    ("deletedAt" IS NULL AND length(trim("body")) > 0)
    OR
    ("deletedAt" IS NOT NULL AND "body" = '')
  );

COMMIT;
