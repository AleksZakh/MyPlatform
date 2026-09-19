/*
  Warnings:

  - You are about to drop the column `manufacturerId` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `qualDate` on the `receipt_materials` table. All the data in the column will be lost.
  - You are about to drop the column `qualDocNumber` on the `receipt_materials` table. All the data in the column will be lost.
  - You are about to drop the column `qualDocPath` on the `receipt_materials` table. All the data in the column will be lost.
  - You are about to drop the column `sActDate` on the `sampling_tests` table. All the data in the column will be lost.
  - You are about to drop the column `sActNumber` on the `sampling_tests` table. All the data in the column will be lost.
  - You are about to drop the column `sDocPath` on the `sampling_tests` table. All the data in the column will be lost.
  - You are about to drop the column `protocolDocPath` on the `test_protocols` table. All the data in the column will be lost.
  - You are about to drop the column `receiptMaterialId` on the `test_protocols` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[receiptMaterialId]` on the table `sampling_tests` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[testProtocolId]` on the table `sampling_tests` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[importSource,importRowNumber]` on the table `sampling_tests` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `samplingActNumber` to the `sampling_tests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `samplingDate` to the `sampling_tests` table without a default value. This is not possible if the table is not empty.
  - Made the column `receiptMaterialId` on table `sampling_tests` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "materials" DROP CONSTRAINT "materials_manufacturerId_fkey";

-- DropForeignKey
ALTER TABLE "sampling_tests" DROP CONSTRAINT "sampling_tests_receiptMaterialId_fkey";

-- DropForeignKey
ALTER TABLE "test_protocols" DROP CONSTRAINT "test_protocols_receiptMaterialId_fkey";

-- DropIndex
DROP INDEX "manufacturers_name_idx";

-- DropIndex
DROP INDEX "materials_name_idx";

-- DropIndex
DROP INDEX "sampling_tests_sActDate_idx";

-- DropIndex
DROP INDEX "sampling_tests_sActNumber_idx";

-- AlterTable
ALTER TABLE "materials" DROP COLUMN "manufacturerId";

-- AlterTable
ALTER TABLE "receipt_materials" DROP COLUMN "qualDate",
DROP COLUMN "qualDocNumber",
DROP COLUMN "qualDocPath",
ADD COLUMN     "manufacturerId" INTEGER,
ADD COLUMN     "qualityDocumentDate" DATE,
ADD COLUMN     "qualityDocumentNumber" VARCHAR(255),
ADD COLUMN     "qualityDocumentPath" TEXT;

-- AlterTable
ALTER TABLE "sampling_tests" DROP COLUMN "sActDate",
DROP COLUMN "sActNumber",
DROP COLUMN "sDocPath",
ADD COLUMN     "businessRulesVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "importRowNumber" INTEGER,
ADD COLUMN     "importSource" VARCHAR(255),
ADD COLUMN     "samplingActNumber" VARCHAR(255) NOT NULL,
ADD COLUMN     "samplingDate" DATE NOT NULL,
ADD COLUMN     "samplingDocumentPath" TEXT,
ALTER COLUMN "receiptMaterialId" SET NOT NULL;

-- AlterTable
ALTER TABLE "test_protocols" DROP COLUMN "protocolDocPath",
DROP COLUMN "receiptMaterialId",
ADD COLUMN     "protocolDocumentPath" TEXT,
ALTER COLUMN "protocolNumber" DROP NOT NULL,
ALTER COLUMN "testResult" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "receipt_materials_receiptDate_idx" ON "receipt_materials"("receiptDate");

-- CreateIndex
CREATE INDEX "receipt_materials_qualityDocumentDate_idx" ON "receipt_materials"("qualityDocumentDate");

-- CreateIndex
CREATE INDEX "receipt_materials_materialId_idx" ON "receipt_materials"("materialId");

-- CreateIndex
CREATE INDEX "receipt_materials_manufacturerId_idx" ON "receipt_materials"("manufacturerId");

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

-- AddForeignKey
ALTER TABLE "receipt_materials" ADD CONSTRAINT "receipt_materials_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sampling_tests" ADD CONSTRAINT "sampling_tests_receiptMaterialId_fkey" FOREIGN KEY ("receiptMaterialId") REFERENCES "receipt_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
