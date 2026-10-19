-- CreateTable
CREATE TABLE "library_videos" (
    "id" UUID NOT NULL,
    "clientKey" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "author" VARCHAR(500) NOT NULL DEFAULT '',
    "filename" VARCHAR(255) NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "totalBytes" BIGINT NOT NULL,
    "offset" BIGINT NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'UPLOADING',
    "error" VARCHAR(1000),
    "duration" DOUBLE PRECISION,
    "mediaPath" VARCHAR(100),
    "posterPath" VARCHAR(100),
    "sourcePath" VARCHAR(100),
    "mediaBytes" BIGINT,
    "leaseToken" UUID,
    "leaseUntil" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "library_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_video_categories" (
    "videoId" UUID NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "library_video_categories_pkey" PRIMARY KEY ("videoId","categoryId")
);

-- CreateTable
CREATE TABLE "library_video_chunks" (
    "id" UUID NOT NULL,
    "videoId" UUID NOT NULL,
    "offset" BIGINT NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "library_video_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_video_positions" (
    "videoId" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "seconds" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_video_positions_pkey" PRIMARY KEY ("videoId","userId")
);

-- CreateTable
CREATE TABLE "library_video_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "maxBytes" BIGINT NOT NULL DEFAULT 3221225472,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_video_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "library_videos_clientKey_key" ON "library_videos"("clientKey");

-- CreateIndex
CREATE INDEX "library_videos_deletedAt_status_createdAt_idx" ON "library_videos"("deletedAt", "status", "createdAt");

-- CreateIndex
CREATE INDEX "library_video_categories_categoryId_idx" ON "library_video_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "library_video_chunks_videoId_offset_key" ON "library_video_chunks"("videoId", "offset");

-- AddForeignKey
ALTER TABLE "library_video_categories" ADD CONSTRAINT "library_video_categories_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "library_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_video_categories" ADD CONSTRAINT "library_video_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "library_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_video_chunks" ADD CONSTRAINT "library_video_chunks_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "library_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_video_positions" ADD CONSTRAINT "library_video_positions_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "library_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_video_positions" ADD CONSTRAINT "library_video_positions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Guard state/offset invariants independently of application validation.
ALTER TABLE "library_videos" ADD CONSTRAINT "library_video_offset_valid" CHECK ("totalBytes" > 0 AND "offset" >= 0 AND "offset" <= "totalBytes");
ALTER TABLE "library_videos" ADD CONSTRAINT "library_video_status_valid" CHECK ("status" IN ('UPLOADING','QUEUED','PROCESSING','READY','ERROR'));
ALTER TABLE "library_video_chunks" ADD CONSTRAINT "library_video_chunk_valid" CHECK ("offset" >= 0 AND "size" > 0 AND "size" <= 8388608);
ALTER TABLE "library_video_settings" ADD CONSTRAINT "library_video_settings_valid" CHECK (id = 1 AND "maxBytes" BETWEEN 104857600 AND 10737418240);
