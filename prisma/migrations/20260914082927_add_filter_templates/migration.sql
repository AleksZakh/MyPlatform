-- CreateTable
CREATE TABLE "filter_templates" (
    "id" SERIAL NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "authorEmail" VARCHAR(255) NOT NULL,
    "filters" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "editorEmail" VARCHAR(255),
    "deletedAt" DATE,
    "deletedBy" VARCHAR(255),

    CONSTRAINT "filter_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "filter_templates_timestamp_key" ON "filter_templates"("timestamp");

-- CreateIndex
CREATE INDEX "filter_templates_authorEmail_idx" ON "filter_templates"("authorEmail");

-- CreateIndex
CREATE INDEX "filter_templates_isDefault_idx" ON "filter_templates"("isDefault");

-- CreateIndex
CREATE INDEX "filter_templates_timestamp_idx" ON "filter_templates"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "filter_templates_authorEmail_name_key" ON "filter_templates"("authorEmail", "name");
