-- CreateTable
CREATE TABLE "plps" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "note" TEXT,

    CONSTRAINT "plps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspectors" (
    "id" SERIAL NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "note" TEXT,

    CONSTRAINT "inspectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "qualDocNumber" VARCHAR(255),
    "qualDocDate" DATE,
    "qualDocPath" TEXT,
    "note" TEXT,
    "manufacturerId" INTEGER,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sampling_acts" (
    "id" SERIAL NOT NULL,
    "number" VARCHAR(255) NOT NULL,
    "date" DATE NOT NULL,
    "place" TEXT NOT NULL,
    "objectName" TEXT NOT NULL,
    "sDocPath" TEXT,
    "note" TEXT,
    "inspectorId" INTEGER NOT NULL,

    CONSTRAINT "sampling_acts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_protocols" (
    "id" SERIAL NOT NULL,
    "protocolNumber" VARCHAR(255) NOT NULL,
    "protocolDate" DATE,
    "protocolDocPath" TEXT,
    "testResult" TEXT NOT NULL,
    "note" TEXT,
    "plpId" INTEGER NOT NULL,
    "samplingActId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "authorEmail" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editorEmail" VARCHAR(255),
    "editedAt" DATE,

    CONSTRAINT "test_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plps_name_key" ON "plps"("name");

-- CreateIndex
CREATE UNIQUE INDEX "inspectors_fullName_key" ON "inspectors"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturers_name_key" ON "manufacturers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sampling_acts_number_key" ON "sampling_acts"("number");

-- CreateIndex
CREATE INDEX "sampling_acts_number_idx" ON "sampling_acts"("number");

-- CreateIndex
CREATE INDEX "test_protocols_protocolNumber_idx" ON "test_protocols"("protocolNumber");

-- CreateIndex
CREATE INDEX "test_protocols_editedAt_idx" ON "test_protocols"("editedAt");

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sampling_acts" ADD CONSTRAINT "sampling_acts_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "inspectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_protocols" ADD CONSTRAINT "test_protocols_plpId_fkey" FOREIGN KEY ("plpId") REFERENCES "plps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_protocols" ADD CONSTRAINT "test_protocols_samplingActId_fkey" FOREIGN KEY ("samplingActId") REFERENCES "sampling_acts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_protocols" ADD CONSTRAINT "test_protocols_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
