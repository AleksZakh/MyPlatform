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

-- AddForeignKey
ALTER TABLE "department_permissions" ADD CONSTRAINT "department_permissions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_permissions" ADD CONSTRAINT "department_permissions_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "access_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory_department_mappings" ADD CONSTRAINT "directory_department_mappings_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
