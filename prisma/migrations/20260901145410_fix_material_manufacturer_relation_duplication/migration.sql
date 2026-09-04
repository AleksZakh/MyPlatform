/*
  Warnings:

  - You are about to drop the column `materialId` on the `manufacturers` table. All the data in the column will be lost.
  - Added the required column `materialId` to the `test_protocols` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "manufacturers" DROP CONSTRAINT "manufacturers_materialId_fkey";

-- AlterTable
ALTER TABLE "manufacturers" DROP COLUMN "materialId";

-- AlterTable
ALTER TABLE "test_protocols" ADD COLUMN     "materialId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "test_protocols" ADD CONSTRAINT "test_protocols_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
