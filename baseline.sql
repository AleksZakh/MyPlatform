-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sessionId" VARCHAR(255) NOT NULL,
    "timestamp" BIGINT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "userName" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "login" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" VARCHAR(100) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aeng" (
    "id" SERIAL NOT NULL,
    "plp" VARCHAR(50) NOT NULL,
    "objectName" TEXT NOT NULL,
    "samplingActNumber" VARCHAR(100) NOT NULL,
    "samplingDate" DATE NOT NULL,
    "samplingPlace" TEXT NOT NULL,
    "personProvidedSample" VARCHAR(255) NOT NULL,
    "materialReceiptDate" DATE,
    "materialName" VARCHAR(255) NOT NULL,
    "qualityDocument" VARCHAR(100) NOT NULL,
    "sDocPath" VARCHAR(255),
    "qualDocPath" VARCHAR(255),
    "testDocPath" VARCHAR(255),
    "protocolDocPath" VARCHAR(255),
    "qualDocNumber" VARCHAR(100),
    "qualDocDate" DATE,
    "authorEmail" VARCHAR(100),
    "editorEmail" VARCHAR(100),
    "manufacturer" VARCHAR(255),
    "protocolNumber" VARCHAR(100) NOT NULL,
    "protocolDate" DATE,
    "testResult" VARCHAR(100) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aeng_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionid_unique" ON "sessions"("sessionId");

-- CreateIndex
CREATE INDEX "idx_sessions_sessionId" ON "sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_unique" ON "users"("userName");

-- CreateIndex
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_userName" ON "users"("userName");

-- CreateIndex
CREATE INDEX "aeng_samplingActNumber_idx" ON "aeng"("samplingActNumber");

-- CreateIndex
CREATE INDEX "aeng_protocolNumber_idx" ON "aeng"("protocolNumber");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userid_foreign" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

