CREATE TABLE "user_preferences" (
  "userId" INTEGER NOT NULL PRIMARY KEY,
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
