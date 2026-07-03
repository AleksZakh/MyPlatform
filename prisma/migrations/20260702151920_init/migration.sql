/*
  Warnings:

  - You are about to drop the `incoming_control` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "incoming_control";

-- CreateTable
CREATE TABLE "aeng" (
    "id" SERIAL NOT NULL,
    "plp" VARCHAR(50) NOT NULL,
    "objectName" TEXT NOT NULL,
    "samplingActNumber" VARCHAR(100) NOT NULL,
    "samplingDate" DATE NOT NULL,
    "samplingPlace" TEXT NOT NULL,
    "personProvidedSample" VARCHAR(255) NOT NULL,
    "materialReceiptDate" DATE NOT NULL,
    "materialName" VARCHAR(255) NOT NULL,
    "qualityDocument" VARCHAR(100) NOT NULL,
    "manufacturer" VARCHAR(255),
    "protocolNumber" VARCHAR(100) NOT NULL,
    "protocolDate" DATE NOT NULL,
    "testResult" VARCHAR(100) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aeng_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aeng_samplingActNumber_idx" ON "aeng"("samplingActNumber");

-- CreateIndex
CREATE INDEX "aeng_protocolNumber_idx" ON "aeng"("protocolNumber");
