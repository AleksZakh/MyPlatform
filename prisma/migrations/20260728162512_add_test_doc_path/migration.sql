-- AlterTable
ALTER TABLE "aeng" ADD COLUMN     "authorEmail" VARCHAR(100),
ADD COLUMN     "qualDocDate" DATE,
ADD COLUMN     "testDocPath" VARCHAR(255);

-- 1. Добавляем новое поле
ALTER TABLE "aeng" ADD COLUMN "testDocPath" TEXT;

-- 2. Копируем данные из старого поля в новое
UPDATE "aeng" SET "testDocPath" = "qualDocPath" WHERE "qualDocPath" IS NOT NULL;
