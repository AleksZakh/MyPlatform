/*
  Warnings:

  - You are about to drop the column `manufacturerId` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `materialId` on the `test_protocols` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `materials` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `manufacturerId` to the `test_protocols` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "materials" DROP CONSTRAINT "materials_manufacturerId_fkey";

-- DropForeignKey
ALTER TABLE "test_protocols" DROP CONSTRAINT "test_protocols_materialId_fkey";

-- AlterTable
ALTER TABLE "manufacturers" ADD COLUMN     "materialId" INTEGER;

-- AlterTable
ALTER TABLE "materials" DROP COLUMN "manufacturerId";

-- AlterTable
ALTER TABLE "test_protocols" DROP COLUMN "materialId",
ADD COLUMN     "manufacturerId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "materials_name_key" ON "materials"("name");

-- AddForeignKey
ALTER TABLE "manufacturers" ADD CONSTRAINT "manufacturers_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_protocols" ADD CONSTRAINT "test_protocols_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
