/*
  Warnings:

  - You are about to drop the column `samplingTestId` on the `test_protocols` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[protocolNumber]` on the table `test_protocols` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "test_protocols" DROP CONSTRAINT "test_protocols_samplingTestId_fkey";

-- AlterTable
ALTER TABLE "sampling_tests" ADD COLUMN     "testProtocolId" INTEGER;

-- AlterTable
ALTER TABLE "test_protocols" DROP COLUMN "samplingTestId";

-- CreateIndex
CREATE UNIQUE INDEX "test_protocols_protocolNumber_key" ON "test_protocols"("protocolNumber");

-- AddForeignKey
ALTER TABLE "sampling_tests" ADD CONSTRAINT "sampling_tests_testProtocolId_fkey" FOREIGN KEY ("testProtocolId") REFERENCES "test_protocols"("id") ON DELETE SET NULL ON UPDATE CASCADE;
