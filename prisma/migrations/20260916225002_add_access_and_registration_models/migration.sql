-- CreateEnum
CREATE TYPE "AccessResourceType" AS ENUM ('TABLE', 'SECTION', 'FEATURE');

-- CreateEnum
CREATE TYPE "RegistrationRequestStatus" AS ENUM ('EMAIL_PENDING', 'PENDING_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'EXPIRED', 'COMPLETED');

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_resources" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(150) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "AccessResourceType" NOT NULL DEFAULT 'TABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_resources" (
    "departmentId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "department_resources_pkey" PRIMARY KEY ("departmentId","resourceId")
);

-- CreateTable
CREATE TABLE "registration_requests" (
    "id" SERIAL NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "organization" VARCHAR(255) NOT NULL,
    "position" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "accessReason" TEXT,
    "status" "RegistrationRequestStatus" NOT NULL DEFAULT 'EMAIL_PENDING',
    "emailVerifiedAt" TIMESTAMP(3),
    "verificationTokenHash" VARCHAR(64),
    "verificationExpiresAt" TIMESTAMP(3),
    "verificationSentAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedByLogin" VARCHAR(255),
    "adminComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_request_resources" (
    "id" SERIAL NOT NULL,
    "registrationRequestId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "approved" BOOLEAN,
    "adminComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_request_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_key_key" ON "departments"("key");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE INDEX "departments_isActive_idx" ON "departments"("isActive");

-- CreateIndex
CREATE INDEX "departments_sortOrder_idx" ON "departments"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "access_resources_key_key" ON "access_resources"("key");

-- CreateIndex
CREATE INDEX "access_resources_isActive_idx" ON "access_resources"("isActive");

-- CreateIndex
CREATE INDEX "access_resources_type_idx" ON "access_resources"("type");

-- CreateIndex
CREATE INDEX "access_resources_sortOrder_idx" ON "access_resources"("sortOrder");

-- CreateIndex
CREATE INDEX "department_resources_resourceId_idx" ON "department_resources"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_requests_verificationTokenHash_key" ON "registration_requests"("verificationTokenHash");

-- CreateIndex
CREATE INDEX "registration_requests_email_idx" ON "registration_requests"("email");

-- CreateIndex
CREATE INDEX "registration_requests_status_idx" ON "registration_requests"("status");

-- CreateIndex
CREATE INDEX "registration_requests_createdAt_idx" ON "registration_requests"("createdAt");

-- CreateIndex
CREATE INDEX "registration_requests_email_status_idx" ON "registration_requests"("email", "status");

-- CreateIndex
CREATE INDEX "registration_request_resources_registrationRequestId_idx" ON "registration_request_resources"("registrationRequestId");

-- CreateIndex
CREATE INDEX "registration_request_resources_resourceId_idx" ON "registration_request_resources"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_request_resources_registrationRequestId_resour_key" ON "registration_request_resources"("registrationRequestId", "resourceId");

-- AddForeignKey
ALTER TABLE "department_resources" ADD CONSTRAINT "department_resources_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_resources" ADD CONSTRAINT "department_resources_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "access_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_request_resources" ADD CONSTRAINT "registration_request_resources_registrationRequestId_fkey" FOREIGN KEY ("registrationRequestId") REFERENCES "registration_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_request_resources" ADD CONSTRAINT "registration_request_resources_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "access_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
