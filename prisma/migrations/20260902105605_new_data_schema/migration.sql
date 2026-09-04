/*
  Warnings:

  - You are about to drop the column `fullName` on the `inspectors` table. All the data in the column will be lost.
  - You are about to drop the column `qualDocDate` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `qualDocNumber` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `qualDocPath` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `authorEmail` on the `test_protocols` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `test_protocols` table. All the data in the column will be lost.
  - You are about to drop the column `editedAt` on the `test_protocols` table. All the data in the column will be lost.
  - You are about to drop the column `editorEmail` on the `test_protocols` table. All the data in the column will be lost.
  - You are about to drop the column `manufacturerId` on the `test_protocols` table. All the data in the column will be lost.
  - You are about to drop the column `materialId` on the `test_protocols` table. All the data in the column will be lost.
  - You are about to drop the column `plpId` on the `test_protocols` table. All the data in the column will be lost.
  - You are about to drop the column `samplingActId` on the `test_protocols` table. All the data in the column will be lost.
  - You are about to drop the `sampling_acts` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `inspectors` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `inspectors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiptMaterialId` to the `test_protocols` table without a default value. This is not possible if the table is not empty.
  - Added the required column `samplingTestId` to the `test_protocols` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "sampling_acts" DROP CONSTRAINT "sampling_acts_inspectorId_fkey";

-- DropForeignKey
ALTER TABLE "test_protocols" DROP CONSTRAINT "test_protocols_manufacturerId_fkey";

-- DropForeignKey
ALTER TABLE "test_protocols" DROP CONSTRAINT "test_protocols_materialId_fkey";

-- DropForeignKey
ALTER TABLE "test_protocols" DROP CONSTRAINT "test_protocols_plpId_fkey";

-- DropForeignKey
ALTER TABLE "test_protocols" DROP CONSTRAINT "test_protocols_samplingActId_fkey";

-- DropIndex
DROP INDEX "inspectors_fullName_key";

-- DropIndex
DROP INDEX "materials_name_key";

-- DropIndex
DROP INDEX "test_protocols_editedAt_idx";

-- AlterTable
ALTER TABLE "inspectors" DROP COLUMN "fullName",
ADD COLUMN     "name" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "materials" DROP COLUMN "qualDocDate",
DROP COLUMN "qualDocNumber",
DROP COLUMN "qualDocPath",
ADD COLUMN     "manufacturerId" INTEGER;

-- AlterTable
ALTER TABLE "test_protocols" DROP COLUMN "authorEmail",
DROP COLUMN "createdAt",
DROP COLUMN "editedAt",
DROP COLUMN "editorEmail",
DROP COLUMN "manufacturerId",
DROP COLUMN "materialId",
DROP COLUMN "plpId",
DROP COLUMN "samplingActId",
ADD COLUMN     "receiptMaterialId" INTEGER NOT NULL,
ADD COLUMN     "samplingTestId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "sampling_acts";

-- CreateTable
CREATE TABLE "receipt_materials" (
    "id" SERIAL NOT NULL,
    "qualDate" DATE,
    "qualDocNumber" VARCHAR(255),
    "qualDocPath" TEXT,
    "materialId" INTEGER NOT NULL,

    CONSTRAINT "receipt_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_objects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "test_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_locations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "testObjectId" INTEGER NOT NULL,

    CONSTRAINT "test_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sampling_tests" (
    "id" SERIAL NOT NULL,
    "sActNumber" VARCHAR(255) NOT NULL,
    "sActDate" DATE NOT NULL,
    "sDocPath" TEXT,
    "note" TEXT,
    "plpId" INTEGER NOT NULL,
    "inspectorId" INTEGER NOT NULL,
    "testLocationId" INTEGER NOT NULL,

    CONSTRAINT "sampling_tests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_objects_name_key" ON "test_objects"("name");

-- CreateIndex
CREATE INDEX "test_objects_name_idx" ON "test_objects"("name");

-- CreateIndex
CREATE INDEX "test_locations_name_idx" ON "test_locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "test_locations_testObjectId_name_key" ON "test_locations"("testObjectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "sampling_tests_sActNumber_key" ON "sampling_tests"("sActNumber");

-- CreateIndex
CREATE INDEX "sampling_tests_sActNumber_idx" ON "sampling_tests"("sActNumber");

-- CreateIndex
CREATE INDEX "sampling_tests_sActDate_idx" ON "sampling_tests"("sActDate");

-- CreateIndex
CREATE UNIQUE INDEX "inspectors_name_key" ON "inspectors"("name");

-- CreateIndex
CREATE INDEX "manufacturers_name_idx" ON "manufacturers"("name");

-- CreateIndex
CREATE INDEX "materials_name_idx" ON "materials"("name");

-- CreateIndex
CREATE INDEX "test_protocols_protocolDate_idx" ON "test_protocols"("protocolDate");

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_materials" ADD CONSTRAINT "receipt_materials_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_locations" ADD CONSTRAINT "test_locations_testObjectId_fkey" FOREIGN KEY ("testObjectId") REFERENCES "test_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sampling_tests" ADD CONSTRAINT "sampling_tests_plpId_fkey" FOREIGN KEY ("plpId") REFERENCES "plps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sampling_tests" ADD CONSTRAINT "sampling_tests_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "inspectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sampling_tests" ADD CONSTRAINT "sampling_tests_testLocationId_fkey" FOREIGN KEY ("testLocationId") REFERENCES "test_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_protocols" ADD CONSTRAINT "test_protocols_receiptMaterialId_fkey" FOREIGN KEY ("receiptMaterialId") REFERENCES "receipt_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_protocols" ADD CONSTRAINT "test_protocols_samplingTestId_fkey" FOREIGN KEY ("samplingTestId") REFERENCES "sampling_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
