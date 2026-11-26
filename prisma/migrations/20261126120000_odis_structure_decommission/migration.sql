-- Historical contracts and reports continue to read a retired structure.
ALTER TABLE "diagnostic_structures" ADD COLUMN "decommissionedAt" TIMESTAMP(3);
