-- CreateTable
CREATE TABLE "diagnostic_trip_executors" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "normalizedName" VARCHAR(255) NOT NULL,

    CONSTRAINT "diagnostic_trip_executors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_trips" (
    "id" SERIAL NOT NULL,
    "number" VARCHAR(200) NOT NULL,
    "contractId" INTEGER NOT NULL,
    "executorId" INTEGER NOT NULL,
    "start" DATE NOT NULL,
    "finish" DATE NOT NULL,
    "noStructures" BOOLEAN NOT NULL DEFAULT false,
    "destination" TEXT NOT NULL DEFAULT '',
    "assignment" TEXT NOT NULL DEFAULT '',
    "equipment" TEXT NOT NULL DEFAULT '',
    "transport" TEXT NOT NULL DEFAULT '',
    "accommodation" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    "contentKey" VARCHAR(64) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedById" INTEGER,

    CONSTRAINT "diagnostic_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_trip_participants" (
    "tripId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "diagnostic_trip_participants_pkey" PRIMARY KEY ("tripId","userId")
);

-- CreateTable
CREATE TABLE "diagnostic_trip_structures" (
    "tripId" INTEGER NOT NULL,
    "structureId" INTEGER NOT NULL,

    CONSTRAINT "diagnostic_trip_structures_pkey" PRIMARY KEY ("tripId","structureId")
);

-- CreateTable
CREATE TABLE "diagnostic_trip_origins" (
    "legacyId" INTEGER NOT NULL,
    "tripId" INTEGER NOT NULL,
    "sourceNumber" VARCHAR(200) NOT NULL,
    "sourceHash" VARCHAR(64) NOT NULL,
    "sourceFileHash" VARCHAR(64) NOT NULL,
    "targetHash" VARCHAR(64) NOT NULL,
    "importedById" INTEGER NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_trip_origins_pkey" PRIMARY KEY ("legacyId")
);

-- CreateTable
CREATE TABLE "diagnostic_trip_completions" (
    "id" SERIAL NOT NULL,
    "tripId" INTEGER NOT NULL,
    "contractWorkId" INTEGER,
    "structureWorkId" INTEGER,

    CONSTRAINT "diagnostic_trip_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_trip_executors_normalizedName_key" ON "diagnostic_trip_executors"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_trips_contentKey_key" ON "diagnostic_trips"("contentKey");

-- CreateIndex
CREATE INDEX "diagnostic_trips_start_finish_idx" ON "diagnostic_trips"("start", "finish");

-- CreateIndex
CREATE INDEX "diagnostic_trips_contractId_idx" ON "diagnostic_trips"("contractId");

-- CreateIndex
CREATE INDEX "diagnostic_trips_executorId_idx" ON "diagnostic_trips"("executorId");

-- CreateIndex
CREATE INDEX "diagnostic_trip_participants_userId_idx" ON "diagnostic_trip_participants"("userId");

-- CreateIndex
CREATE INDEX "diagnostic_trip_structures_structureId_idx" ON "diagnostic_trip_structures"("structureId");

-- CreateIndex
CREATE INDEX "diagnostic_trip_origins_tripId_idx" ON "diagnostic_trip_origins"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_trip_completions_contractWorkId_key" ON "diagnostic_trip_completions"("contractWorkId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_trip_completions_structureWorkId_key" ON "diagnostic_trip_completions"("structureWorkId");

-- CreateIndex
CREATE INDEX "diagnostic_trip_completions_tripId_idx" ON "diagnostic_trip_completions"("tripId");

-- AddForeignKey
ALTER TABLE "diagnostic_trips" ADD CONSTRAINT "diagnostic_trips_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "diagnostic_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_trips" ADD CONSTRAINT "diagnostic_trips_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "diagnostic_trip_executors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_trip_participants" ADD CONSTRAINT "diagnostic_trip_participants_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "diagnostic_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_trip_participants" ADD CONSTRAINT "diagnostic_trip_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_trip_structures" ADD CONSTRAINT "diagnostic_trip_structures_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "diagnostic_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_trip_structures" ADD CONSTRAINT "diagnostic_trip_structures_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "diagnostic_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_trip_origins" ADD CONSTRAINT "diagnostic_trip_origins_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "diagnostic_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_trip_completions" ADD CONSTRAINT "diagnostic_trip_completions_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "diagnostic_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_trip_completions" ADD CONSTRAINT "diagnostic_trip_completions_contractWorkId_fkey" FOREIGN KEY ("contractWorkId") REFERENCES "diagnostic_contract_works"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_trip_completions" ADD CONSTRAINT "diagnostic_trip_completions_structureWorkId_fkey" FOREIGN KEY ("structureWorkId") REFERENCES "diagnostic_structure_works"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "diagnostic_trips" ADD CONSTRAINT "diagnostic_trip_dates_check" CHECK ("start" <= "finish");
ALTER TABLE "diagnostic_trips" ADD CONSTRAINT "diagnostic_trip_status_check" CHECK ("status" IN ('PLANNED','COMPLETED'));
ALTER TABLE "diagnostic_trip_completions" ADD CONSTRAINT "diagnostic_trip_completion_one_work" CHECK (("contractWorkId" IS NULL) <> ("structureWorkId" IS NULL));
INSERT INTO "diagnostic_trip_executors" ("name","normalizedName") VALUES ('ОДИС','одис'),('Автодор Инжиниринг','автодор инжиниринг');
