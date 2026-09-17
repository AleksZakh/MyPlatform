-- CreateEnum
CREATE TYPE "UserAuthType" AS ENUM ('DOMAIN', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'BLOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "AccessAction" AS ENUM ('VIEW', 'CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "app_users" (
    "id" SERIAL NOT NULL,
    "authType" "UserAuthType" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "login" VARCHAR(255),
    "directoryObjectId" VARCHAR(255),
    "email" VARCHAR(255),
    "fullName" VARCHAR(255),
    "organization" VARCHAR(255),
    "position" VARCHAR(255),
    "passwordHash" VARCHAR(255),
    "departmentId" INTEGER,
    "registrationRequestId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "action" "AccessAction" NOT NULL,
    "grantedByLogin" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_users_login_key" ON "app_users"("login");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_directoryObjectId_key" ON "app_users"("directoryObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_registrationRequestId_key" ON "app_users"("registrationRequestId");

-- CreateIndex
CREATE INDEX "app_users_status_idx" ON "app_users"("status");

-- CreateIndex
CREATE INDEX "app_users_authType_idx" ON "app_users"("authType");

-- CreateIndex
CREATE INDEX "app_users_departmentId_idx" ON "app_users"("departmentId");

-- CreateIndex
CREATE INDEX "user_permissions_userId_idx" ON "user_permissions"("userId");

-- CreateIndex
CREATE INDEX "user_permissions_resourceId_idx" ON "user_permissions"("resourceId");

-- CreateIndex
CREATE INDEX "user_permissions_action_idx" ON "user_permissions"("action");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_userId_resourceId_action_key" ON "user_permissions"("userId", "resourceId", "action");

-- AddForeignKey
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_registrationRequestId_fkey" FOREIGN KEY ("registrationRequestId") REFERENCES "registration_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "access_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
