-- AlterTable
ALTER TABLE "aeng" 
ADD COLUMN "authorEmail" VARCHAR(100),
ADD COLUMN "editorEmail" VARCHAR(100),
ADD COLUMN "qualDocDate" DATE,
ADD COLUMN "testDocPath" TEXT,
ALTER COLUMN "materialReceiptDate" DROP NOT NULL,
ALTER COLUMN "protocolDate" DROP NOT NULL;