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
CREATE UNIQUE INDEX "domain_groups_directoryObjectId_key" ON "domain_groups"("directoryObjectId");

-- CreateIndex
CREATE INDEX "domain_group_permissions_resourceId_action_idx" ON "domain_group_permissions"("resourceId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "domain_group_permissions_domainGroupId_resourceId_action_key" ON "domain_group_permissions"("domainGroupId", "resourceId", "action");

-- AddForeignKey
ALTER TABLE "domain_group_permissions" ADD CONSTRAINT "domain_group_permissions_domainGroupId_fkey" FOREIGN KEY ("domainGroupId") REFERENCES "domain_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_group_permissions" ADD CONSTRAINT "domain_group_permissions_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "access_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

