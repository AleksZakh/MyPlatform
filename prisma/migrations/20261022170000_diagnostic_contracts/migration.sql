-- CreateEnum
CREATE TYPE "DiagnosticContractDirection" AS ENUM ('INCOME', 'EXPENSE', 'INTERNAL');

-- CreateTable
CREATE TABLE "diagnostic_counterparties" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "normalizedName" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_counterparties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_project_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "diagnostic_project_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_contracts" (
    "id" SERIAL NOT NULL,
    "number" VARCHAR(150) NOT NULL,
    "date" DATE NOT NULL,
    "counterpartyId" INTEGER NOT NULL,
    "direction" "DiagnosticContractDirection" NOT NULL,
    "executor" VARCHAR(255),
    "start" DATE,
    "finish" DATE,
    "stages" INTEGER,
    "hours" DECIMAL(14,2),
    "amount" DECIMAL(18,2),
    "note" TEXT,
    "projectTypeId" INTEGER,
    "supervisorId" INTEGER,
    "relatedContractId" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" INTEGER,

    CONSTRAINT "diagnostic_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_contract_structures" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "legacyStructureId" VARCHAR(150) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "diagnostic_contract_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permission_denials" (
    "userId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "action" "AccessAction" NOT NULL,

    CONSTRAINT "user_permission_denials_pkey" PRIMARY KEY ("userId","resourceId","action")
);

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_counterparties_normalizedName_key" ON "diagnostic_counterparties"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_project_types_name_key" ON "diagnostic_project_types"("name");

-- CreateIndex
CREATE INDEX "diagnostic_contracts_date_finish_idx" ON "diagnostic_contracts"("date", "finish");

-- CreateIndex
CREATE INDEX "diagnostic_contracts_counterpartyId_idx" ON "diagnostic_contracts"("counterpartyId");

-- CreateIndex
CREATE INDEX "diagnostic_contracts_supervisorId_idx" ON "diagnostic_contracts"("supervisorId");

-- CreateIndex
CREATE INDEX "diagnostic_contracts_relatedContractId_idx" ON "diagnostic_contracts"("relatedContractId");

-- CreateIndex
CREATE INDEX "diagnostic_contracts_deletedAt_idx" ON "diagnostic_contracts"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_contract_structures_contractId_legacyStructureId_key" ON "diagnostic_contract_structures"("contractId", "legacyStructureId");

-- AddForeignKey
ALTER TABLE "diagnostic_contracts" ADD CONSTRAINT "diagnostic_contracts_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "diagnostic_counterparties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_contracts" ADD CONSTRAINT "diagnostic_contracts_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES "diagnostic_project_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_contracts" ADD CONSTRAINT "diagnostic_contracts_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_contracts" ADD CONSTRAINT "diagnostic_contracts_relatedContractId_fkey" FOREIGN KEY ("relatedContractId") REFERENCES "diagnostic_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_contract_structures" ADD CONSTRAINT "diagnostic_contract_structures_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "diagnostic_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_denials" ADD CONSTRAINT "user_permission_denials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_denials" ADD CONSTRAINT "user_permission_denials_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "access_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE diagnostic_contracts ADD CONSTRAINT diagnostic_contract_dates CHECK ("finish" IS NULL OR ("finish">="date" AND ("start" IS NULL OR "finish">="start")));
ALTER TABLE diagnostic_contracts ADD CONSTRAINT diagnostic_contract_numbers CHECK (("amount" IS NULL OR "amount">=0) AND ("hours" IS NULL OR "hours">=0) AND ("stages" IS NULL OR "stages">=0));
ALTER TABLE diagnostic_contracts ADD CONSTRAINT diagnostic_contract_self_link CHECK ("relatedContractId" IS NULL OR "relatedContractId"<>id);
ALTER TABLE diagnostic_contracts ADD CONSTRAINT diagnostic_contract_number_nonempty CHECK (length(trim(number))>0);

INSERT INTO access_resources (key,name,description,type,"isActive","sortOrder","createdAt","updatedAt")
VALUES ('diagnostic.contracts','Диагностика — договоры','Просмотр, создание, изменение и удаление договоров. CREATE также разрешает пополнение справочников контрагентов и типов проекта.','TABLE',true,600,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;
INSERT INTO diagnostic_project_types(name) VALUES
 ('Плановая диагностика'),('Приёмочная диагностика (новая стройка)'),('Приёмочная диагностика (ремонт)'),('Специальное обследование'),
 ('Предпроектное обследование'),('Мониторинг'),('Сопровождение АИС ИССО-Н'),('Внутренний проект')
ON CONFLICT (name) DO NOTHING;
