CREATE TABLE "file_attachments" (
  "id" SERIAL PRIMARY KEY,
  "samplingTestId" INTEGER NOT NULL REFERENCES "sampling_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "path" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "file_attachments_samplingTestId_idx" ON "file_attachments"("samplingTestId");
CREATE TABLE "file_storage_operations" (
  "id" VARCHAR(36) PRIMARY KEY,
  "kind" VARCHAR(30) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
