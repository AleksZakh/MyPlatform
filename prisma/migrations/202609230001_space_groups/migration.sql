-- CreateTable
CREATE TABLE "space_groups" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "space_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_group_users" (
    "groupId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "space_group_users_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "space_group_domains" (
    "groupId" INTEGER NOT NULL,
    "domainGroupId" INTEGER NOT NULL,

    CONSTRAINT "space_group_domains_pkey" PRIMARY KEY ("groupId","domainGroupId")
);

-- CreateTable
CREATE TABLE "space_group_permissions" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "action" "AccessAction" NOT NULL,
    "grantedByLogin" VARCHAR(150),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "space_group_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "space_groups_name_key" ON "space_groups"("name");

-- CreateIndex
CREATE INDEX "space_group_users_userId_idx" ON "space_group_users"("userId");

-- CreateIndex
CREATE INDEX "space_group_domains_domainGroupId_idx" ON "space_group_domains"("domainGroupId");

-- CreateIndex
CREATE INDEX "space_group_permissions_resourceId_action_idx" ON "space_group_permissions"("resourceId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "space_group_permissions_groupId_resourceId_action_key" ON "space_group_permissions"("groupId", "resourceId", "action");

-- AddForeignKey
ALTER TABLE "space_group_users" ADD CONSTRAINT "space_group_users_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "space_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_group_users" ADD CONSTRAINT "space_group_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_group_domains" ADD CONSTRAINT "space_group_domains_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "space_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_group_domains" ADD CONSTRAINT "space_group_domains_domainGroupId_fkey" FOREIGN KEY ("domainGroupId") REFERENCES "domain_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_group_permissions" ADD CONSTRAINT "space_group_permissions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "space_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_group_permissions" ADD CONSTRAINT "space_group_permissions_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "access_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
