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
    "role" VARCHAR(100) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionid_unique" ON "sessions"("sessionId");

-- CreateIndex
CREATE INDEX "idx_sessions_sessionId" ON "sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_unique" ON "users"("userName");

-- CreateIndex
CREATE INDEX "idx_users_userName" ON "users"("userName");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userid_foreign" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
