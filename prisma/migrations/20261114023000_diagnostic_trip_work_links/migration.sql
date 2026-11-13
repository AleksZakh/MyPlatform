-- Nullable normalized link. Existing/imported works and trips remain unchanged.
ALTER TABLE "diagnostic_structure_works" ADD COLUMN "tripId" INTEGER;
CREATE UNIQUE INDEX "diagnostic_structure_works_trip_structure_key" ON "diagnostic_structure_works"("tripId", "structureId");
ALTER TABLE "diagnostic_structure_works" ADD CONSTRAINT "diagnostic_structure_works_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "diagnostic_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
