-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "actorAuthType" VARCHAR(30),
ADD COLUMN     "actorLogin" VARCHAR(255),
ADD COLUMN     "actorUserId" INTEGER,
ADD COLUMN     "category" VARCHAR(20),
ADD COLUMN     "method" VARCHAR(10),
ADD COLUMN     "requestId" VARCHAR(100),
ADD COLUMN     "resourceKey" VARCHAR(150),
ADD COLUMN     "result" VARCHAR(20),
ADD COLUMN     "route" VARCHAR(500),
ADD COLUMN     "targetUserId" INTEGER,
ALTER COLUMN "entityType" DROP NOT NULL,
ALTER COLUMN "entityId" DROP NOT NULL;

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
