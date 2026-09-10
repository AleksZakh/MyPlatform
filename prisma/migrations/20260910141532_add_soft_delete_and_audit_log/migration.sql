-- AlterTable
ALTER TABLE "inspectors" ADD COLUMN     "deletedAt" DATE,
ADD COLUMN     "deletedBy" VARCHAR(255);

-- AlterTable
ALTER TABLE "manufacturers" ADD COLUMN     "deletedAt" DATE,
ADD COLUMN     "deletedBy" VARCHAR(255);

-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "deletedAt" DATE,
ADD COLUMN     "deletedBy" VARCHAR(255);

-- AlterTable
ALTER TABLE "plps" ADD COLUMN     "deletedAt" DATE,
ADD COLUMN     "deletedBy" VARCHAR(255);

-- AlterTable
ALTER TABLE "receipt_materials" ADD COLUMN     "deletedAt" DATE,
ADD COLUMN     "deletedBy" VARCHAR(255);

-- AlterTable
ALTER TABLE "sampling_tests" ADD COLUMN     "deletedAt" DATE,
ADD COLUMN     "deletedBy" VARCHAR(255);

-- AlterTable
ALTER TABLE "test_locations" ADD COLUMN     "deletedAt" DATE,
ADD COLUMN     "deletedBy" VARCHAR(255);

-- AlterTable
ALTER TABLE "test_objects" ADD COLUMN     "deletedAt" DATE,
ADD COLUMN     "deletedBy" VARCHAR(255);

-- AlterTable
ALTER TABLE "test_protocols" ADD COLUMN     "deletedAt" DATE,
ADD COLUMN     "deletedBy" VARCHAR(255);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" INTEGER NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "actorEmail" VARCHAR(255) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "beforeData" JSONB,
    "afterData" JSONB,
    "changedFields" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_actorEmail_idx" ON "audit_logs"("actorEmail");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
