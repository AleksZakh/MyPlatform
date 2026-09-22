-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccessResourceType" AS ENUM ('TABLE', 'SECTION', 'FEATURE');

-- CreateEnum
CREATE TYPE "RegistrationRequestStatus" AS ENUM ('EMAIL_PENDING', 'PENDING_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'EXPIRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "UserAuthType" AS ENUM ('DOMAIN', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'BLOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "AccessAction" AS ENUM ('VIEW', 'CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sessionId" VARCHAR(255) NOT NULL,
    "timestamp" BIGINT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "userName" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "login" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" VARCHAR(100) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aeng" (
    "id" SERIAL NOT NULL,
    "plp" TEXT NOT NULL,
    "objectName" TEXT NOT NULL,
    "samplingActNumber" TEXT NOT NULL,
    "samplingDate" DATE NOT NULL,
    "samplingPlace" TEXT NOT NULL,
    "personProvidedSample" TEXT NOT NULL,
    "materialReceiptDate" DATE,
    "materialName" TEXT NOT NULL,
    "qualityDocument" TEXT NOT NULL,
    "sDocPath" TEXT,
    "qualDocPath" TEXT,
    "testDocPath" TEXT,
    "protocolDocPath" TEXT,
    "qualDocNumber" TEXT,
    "qualDocDate" DATE,
    "authorEmail" TEXT,
    "editorEmail" TEXT,
    "manufacturer" TEXT,
    "protocolNumber" TEXT NOT NULL,
    "protocolDate" DATE,
    "testResult" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" DATE,

    CONSTRAINT "aeng_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plps" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorEmail" VARCHAR(255),
    "editedAt" TIMESTAMP(3),
    "editorEmail" VARCHAR(255),
    "deletedAt" DATE,
    "deletedBy" VARCHAR(255),

    CONSTRAINT "plps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspectors" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorEmail" VARCHAR(255),
    "editedAt" TIMESTAMP(3),
    "editorEmail" VARCHAR(255),
    "deletedAt" DATE,
    "deletedBy" VARCHAR(255),

    CONSTRAINT "inspectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorEmail" VARCHAR(255),
    "editedAt" TIMESTAMP(3),
    "editorEmail" VARCHAR(255),
    "deletedAt" DATE,
    "deletedBy" VARCHAR(255),

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorEmail" VARCHAR(255),
    "editedAt" TIMESTAMP(3),
    "editorEmail" VARCHAR(255),
    "deletedAt" DATE,
    "deletedBy" VARCHAR(255),

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_materials" (
    "id" SERIAL NOT NULL,
    "receiptDate" DATE,
    "qualityDocumentDate" DATE,
    "qualityDocumentNumber" VARCHAR(255),
    "qualityDocumentPath" TEXT,
    "note" TEXT,
    "materialId" INTEGER NOT NULL,
    "manufacturerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorEmail" VARCHAR(255),
    "editedAt" TIMESTAMP(3),
    "editorEmail" VARCHAR(255),
    "deletedAt" DATE,
    "deletedBy" VARCHAR(255),

    CONSTRAINT "receipt_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_objects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorEmail" VARCHAR(255),
    "editedAt" TIMESTAMP(3),
    "editorEmail" VARCHAR(255),
    "deletedAt" DATE,
    "deletedBy" VARCHAR(255),

    CONSTRAINT "test_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_locations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "testObjectId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorEmail" VARCHAR(255),
    "editedAt" TIMESTAMP(3),
    "editorEmail" VARCHAR(255),
    "deletedAt" DATE,
    "deletedBy" VARCHAR(255),

    CONSTRAINT "test_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_protocols" (
    "id" SERIAL NOT NULL,
    "protocolNumber" VARCHAR(255),
    "protocolDate" DATE,
    "protocolDocumentPath" TEXT,
    "testResult" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorEmail" VARCHAR(255),
    "editedAt" TIMESTAMP(3),
    "editorEmail" VARCHAR(255),
    "deletedAt" DATE,
    "deletedBy" VARCHAR(255),

    CONSTRAINT "test_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sampling_tests" (
    "id" SERIAL NOT NULL,
    "samplingActNumber" VARCHAR(255) NOT NULL,
    "samplingDate" DATE NOT NULL,
    "samplingDocumentPath" TEXT,
    "note" TEXT,
    "plpId" INTEGER NOT NULL,
    "inspectorId" INTEGER NOT NULL,
    "testLocationId" INTEGER NOT NULL,
    "receiptMaterialId" INTEGER NOT NULL,
    "testProtocolId" INTEGER,
    "businessRulesVersion" INTEGER NOT NULL DEFAULT 1,
    "importSource" VARCHAR(255),
    "importRowNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorEmail" VARCHAR(255),
    "editedAt" TIMESTAMP(3),
    "editorEmail" VARCHAR(255),
    "deletedAt" DATE,
    "deletedBy" VARCHAR(255),

    CONSTRAINT "sampling_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "entityType" VARCHAR(50),
    "entityId" INTEGER,
    "action" VARCHAR(20) NOT NULL,
    "category" VARCHAR(20),
    "result" VARCHAR(20),
    "resourceKey" VARCHAR(150),
    "actorUserId" INTEGER,
    "actorLogin" VARCHAR(255),
    "actorAuthType" VARCHAR(30),
    "targetUserId" INTEGER,
    "requestId" VARCHAR(100),
    "method" VARCHAR(10),
    "route" VARCHAR(500),
    "actorEmail" VARCHAR(255) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "changedFields" JSONB,
    "changes" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filter_templates" (
    "id" SERIAL NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "authorEmail" VARCHAR(255) NOT NULL,
    "filters" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "editorEmail" VARCHAR(255),
    "deletedAt" DATE,
    "deletedBy" VARCHAR(255),

    CONSTRAINT "filter_templates_pkey" PRIMARY KEY ("id")
);

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
    "activationTokenHash" VARCHAR(64),
    "activationExpiresAt" TIMESTAMP(3),
    "activationSentAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
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

-- CreateTable
CREATE TABLE "department_permissions" (
    "id" SERIAL NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "action" "AccessAction" NOT NULL,
    "grantedByLogin" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory_department_mappings" (
    "id" SERIAL NOT NULL,
    "directoryName" VARCHAR(255) NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "directory_department_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_groups" (
    "id" SERIAL NOT NULL,
    "directoryObjectId" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "distinguishedName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_group_permissions" (
    "id" SERIAL NOT NULL,
    "domainGroupId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "action" "AccessAction" NOT NULL,
    "grantedByLogin" VARCHAR(150),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_group_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionid_unique" ON "sessions"("sessionId");

-- CreateIndex
CREATE INDEX "idx_sessions_sessionId" ON "sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_unique" ON "users"("userName");

-- CreateIndex
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_userName" ON "users"("userName");

-- CreateIndex
CREATE INDEX "aeng_samplingActNumber_idx" ON "aeng"("samplingActNumber");

-- CreateIndex
CREATE INDEX "aeng_protocolNumber_idx" ON "aeng"("protocolNumber");

-- CreateIndex
CREATE INDEX "aeng_editedAt_idx" ON "aeng"("editedAt");

-- CreateIndex
CREATE UNIQUE INDEX "plps_name_key" ON "plps"("name");

-- CreateIndex
CREATE UNIQUE INDEX "inspectors_name_key" ON "inspectors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturers_name_key" ON "manufacturers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "materials_name_key" ON "materials"("name");

-- CreateIndex
CREATE INDEX "receipt_materials_receiptDate_idx" ON "receipt_materials"("receiptDate");

-- CreateIndex
CREATE INDEX "receipt_materials_qualityDocumentDate_idx" ON "receipt_materials"("qualityDocumentDate");

-- CreateIndex
CREATE INDEX "receipt_materials_materialId_idx" ON "receipt_materials"("materialId");

-- CreateIndex
CREATE INDEX "receipt_materials_manufacturerId_idx" ON "receipt_materials"("manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "test_objects_name_key" ON "test_objects"("name");

-- CreateIndex
CREATE INDEX "test_objects_name_idx" ON "test_objects"("name");

-- CreateIndex
CREATE INDEX "test_locations_name_idx" ON "test_locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "test_locations_testObjectId_name_key" ON "test_locations"("testObjectId", "name");

-- CreateIndex
CREATE INDEX "test_protocols_protocolNumber_idx" ON "test_protocols"("protocolNumber");

-- CreateIndex
CREATE INDEX "test_protocols_protocolDate_idx" ON "test_protocols"("protocolDate");

-- CreateIndex
CREATE UNIQUE INDEX "sampling_tests_receiptMaterialId_key" ON "sampling_tests"("receiptMaterialId");

-- CreateIndex
CREATE UNIQUE INDEX "sampling_tests_testProtocolId_key" ON "sampling_tests"("testProtocolId");

-- CreateIndex
CREATE INDEX "sampling_tests_samplingActNumber_idx" ON "sampling_tests"("samplingActNumber");

-- CreateIndex
CREATE INDEX "sampling_tests_samplingDate_idx" ON "sampling_tests"("samplingDate");

-- CreateIndex
CREATE INDEX "sampling_tests_testLocationId_idx" ON "sampling_tests"("testLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "sampling_tests_importSource_importRowNumber_key" ON "sampling_tests"("importSource", "importRowNumber");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_actorEmail_idx" ON "audit_logs"("actorEmail");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_category_idx" ON "audit_logs"("category");

-- CreateIndex
CREATE INDEX "audit_logs_result_idx" ON "audit_logs"("result");

-- CreateIndex
CREATE INDEX "audit_logs_resourceKey_idx" ON "audit_logs"("resourceKey");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "audit_logs_targetUserId_idx" ON "audit_logs"("targetUserId");

-- CreateIndex
CREATE UNIQUE INDEX "filter_templates_timestamp_key" ON "filter_templates"("timestamp");

-- CreateIndex
CREATE INDEX "filter_templates_authorEmail_idx" ON "filter_templates"("authorEmail");

-- CreateIndex
CREATE INDEX "filter_templates_isDefault_idx" ON "filter_templates"("isDefault");

-- CreateIndex
CREATE INDEX "filter_templates_timestamp_idx" ON "filter_templates"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "filter_templates_authorEmail_name_key" ON "filter_templates"("authorEmail", "name");

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

-- CreateIndex
CREATE UNIQUE INDEX "app_users_login_key" ON "app_users"("login");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_directoryObjectId_key" ON "app_users"("directoryObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_activationTokenHash_key" ON "app_users"("activationTokenHash");

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

-- CreateIndex
CREATE INDEX "department_permissions_departmentId_idx" ON "department_permissions"("departmentId");

-- CreateIndex
CREATE INDEX "department_permissions_resourceId_idx" ON "department_permissions"("resourceId");

-- CreateIndex
CREATE INDEX "department_permissions_action_idx" ON "department_permissions"("action");

-- CreateIndex
CREATE UNIQUE INDEX "department_permissions_departmentId_resourceId_action_key" ON "department_permissions"("departmentId", "resourceId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "directory_department_mappings_directoryName_key" ON "directory_department_mappings"("directoryName");

-- CreateIndex
CREATE INDEX "directory_department_mappings_departmentId_idx" ON "directory_department_mappings"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "domain_groups_directoryObjectId_key" ON "domain_groups"("directoryObjectId");

-- CreateIndex
CREATE INDEX "domain_group_permissions_resourceId_action_idx" ON "domain_group_permissions"("resourceId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "domain_group_permissions_domainGroupId_resourceId_action_key" ON "domain_group_permissions"("domainGroupId", "resourceId", "action");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userid_foreign" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "receipt_materials" ADD CONSTRAINT "receipt_materials_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_materials" ADD CONSTRAINT "receipt_materials_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_locations" ADD CONSTRAINT "test_locations_testObjectId_fkey" FOREIGN KEY ("testObjectId") REFERENCES "test_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sampling_tests" ADD CONSTRAINT "sampling_tests_plpId_fkey" FOREIGN KEY ("plpId") REFERENCES "plps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sampling_tests" ADD CONSTRAINT "sampling_tests_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "inspectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sampling_tests" ADD CONSTRAINT "sampling_tests_testLocationId_fkey" FOREIGN KEY ("testLocationId") REFERENCES "test_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sampling_tests" ADD CONSTRAINT "sampling_tests_receiptMaterialId_fkey" FOREIGN KEY ("receiptMaterialId") REFERENCES "receipt_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sampling_tests" ADD CONSTRAINT "sampling_tests_testProtocolId_fkey" FOREIGN KEY ("testProtocolId") REFERENCES "test_protocols"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_resources" ADD CONSTRAINT "department_resources_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_resources" ADD CONSTRAINT "department_resources_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "access_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_request_resources" ADD CONSTRAINT "registration_request_resources_registrationRequestId_fkey" FOREIGN KEY ("registrationRequestId") REFERENCES "registration_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_request_resources" ADD CONSTRAINT "registration_request_resources_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "access_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_registrationRequestId_fkey" FOREIGN KEY ("registrationRequestId") REFERENCES "registration_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "access_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_permissions" ADD CONSTRAINT "department_permissions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_permissions" ADD CONSTRAINT "department_permissions_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "access_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory_department_mappings" ADD CONSTRAINT "directory_department_mappings_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_group_permissions" ADD CONSTRAINT "domain_group_permissions_domainGroupId_fkey" FOREIGN KEY ("domainGroupId") REFERENCES "domain_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_group_permissions" ADD CONSTRAINT "domain_group_permissions_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "access_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

