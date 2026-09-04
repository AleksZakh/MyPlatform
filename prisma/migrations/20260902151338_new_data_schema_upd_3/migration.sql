/*
  Warnings:

  - Made the column `testProtocolId` on table `sampling_tests` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "sampling_tests" DROP CONSTRAINT "sampling_tests_testProtocolId_fkey";

-- DropIndex
DROP INDEX "sampling_tests_sActNumber_key";

-- DropIndex
DROP INDEX "test_protocols_protocolNumber_key";

-- AlterTable
ALTER TABLE "sampling_tests" ALTER COLUMN "testProtocolId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "sampling_tests" ADD CONSTRAINT "sampling_tests_testProtocolId_fkey" FOREIGN KEY ("testProtocolId") REFERENCES "test_protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
