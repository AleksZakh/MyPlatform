CREATE TABLE "phone_directory_details" (
  "directoryKey" VARCHAR(300) NOT NULL,
  "city" VARCHAR(120) NOT NULL DEFAULT '',
  "address" VARCHAR(500) NOT NULL DEFAULT '',
  "room" VARCHAR(100) NOT NULL DEFAULT '',
  "mobilePhone" VARCHAR(50) NOT NULL DEFAULT '',
  "updatedByUserId" INTEGER,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "phone_directory_details_pkey" PRIMARY KEY ("directoryKey")
);
