-- AlterTable
ALTER TABLE "sampling_tests" ADD COLUMN     "receiptMaterialId" INTEGER;

-- AddForeignKey
ALTER TABLE "sampling_tests" ADD CONSTRAINT "sampling_tests_receiptMaterialId_fkey" FOREIGN KEY ("receiptMaterialId") REFERENCES "receipt_materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
