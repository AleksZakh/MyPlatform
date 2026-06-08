-- CreateTable
CREATE TABLE "incoming_control" (
    "id" SERIAL NOT NULL,
    "plp" VARCHAR(50) NOT NULL,
    "objectName" TEXT NOT NULL,
    "samplingActNumber" VARCHAR(100) NOT NULL,
    "samplingDate" DATE NOT NULL,
    "samplingLocation" TEXT NOT NULL,
    "providerPerson" VARCHAR(255) NOT NULL,
    "receivedDate" DATE NOT NULL,
    "materialName" VARCHAR(255) NOT NULL,
    "qualityDocument" VARCHAR(100) NOT NULL,
    "manufacturer" VARCHAR(255),
    "protocolNumber" VARCHAR(100) NOT NULL,
    "protocolDate" DATE NOT NULL,
    "testResult" VARCHAR(100) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incoming_control_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incoming_control_samplingActNumber_idx" ON "incoming_control"("samplingActNumber");

-- CreateIndex
CREATE INDEX "incoming_control_protocolNumber_idx" ON "incoming_control"("protocolNumber");
