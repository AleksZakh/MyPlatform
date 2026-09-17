/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `app_users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[activationTokenHash]` on the table `app_users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "app_users" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "activationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "activationSentAt" TIMESTAMP(3),
ADD COLUMN     "activationTokenHash" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_activationTokenHash_key" ON "app_users"("activationTokenHash");
