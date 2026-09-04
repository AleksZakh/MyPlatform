-- DropForeignKey
ALTER TABLE "sampling_tests" DROP CONSTRAINT "sampling_tests_testProtocolId_fkey";

-- AlterTable
ALTER TABLE "sampling_tests" ALTER COLUMN "testProtocolId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "sampling_tests" ADD CONSTRAINT "sampling_tests_testProtocolId_fkey" FOREIGN KEY ("testProtocolId") REFERENCES "test_protocols"("id") ON DELETE SET NULL ON UPDATE CASCADE;
