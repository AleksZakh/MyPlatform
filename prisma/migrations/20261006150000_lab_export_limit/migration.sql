CREATE TABLE "lab_export_settings" (
 "id" INTEGER PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
 "recordLimit" INTEGER NOT NULL DEFAULT 500 CHECK ("recordLimit" BETWEEN 1 AND 10000),
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "editorLogin" TEXT
);
INSERT INTO "lab_export_settings" ("id", "recordLimit") VALUES (1, 500);
