-- CreateTable
CREATE TABLE "library_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "parentId" INTEGER,
    "icon" VARCHAR(100) NOT NULL DEFAULT 'lucide:book-open',
    "iconAssetId" UUID,
    "position" INTEGER NOT NULL DEFAULT 0,
    "legacyId" INTEGER,

    CONSTRAINT "library_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_books" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "author" VARCHAR(500) NOT NULL DEFAULT '',
    "publisher" VARCHAR(300) NOT NULL DEFAULT '',
    "year" VARCHAR(100) NOT NULL DEFAULT '',
    "city" VARCHAR(500) NOT NULL DEFAULT '',
    "keywords" VARCHAR(2000) NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "series" VARCHAR(300) NOT NULL DEFAULT '',
    "issue" VARCHAR(100) NOT NULL DEFAULT '',
    "pdfId" UUID NOT NULL,
    "coverId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legacyId" INTEGER,

    CONSTRAINT "library_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_book_categories" (
    "bookId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "library_book_categories_pkey" PRIMARY KEY ("bookId","categoryId")
);

-- CreateTable
CREATE TABLE "library_assets" (
    "id" UUID NOT NULL,
    "kind" VARCHAR(10) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "size" INTEGER NOT NULL,
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "library_categories_legacyId_key" ON "library_categories"("legacyId");

-- CreateIndex
CREATE INDEX "library_categories_parentId_position_idx" ON "library_categories"("parentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "library_books_legacyId_key" ON "library_books"("legacyId");

-- CreateIndex
CREATE INDEX "library_books_deletedAt_title_idx" ON "library_books"("deletedAt", "title");

-- CreateIndex
CREATE INDEX "library_books_series_year_idx" ON "library_books"("series", "year");

-- CreateIndex
CREATE INDEX "library_book_categories_categoryId_idx" ON "library_book_categories"("categoryId");

-- AddForeignKey
ALTER TABLE "library_categories" ADD CONSTRAINT "library_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "library_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_categories" ADD CONSTRAINT "library_categories_iconAssetId_fkey" FOREIGN KEY ("iconAssetId") REFERENCES "library_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_books" ADD CONSTRAINT "library_books_pdfId_fkey" FOREIGN KEY ("pdfId") REFERENCES "library_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_books" ADD CONSTRAINT "library_books_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "library_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_book_categories" ADD CONSTRAINT "library_book_categories_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "library_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_book_categories" ADD CONSTRAINT "library_book_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "library_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE library_assets ADD CONSTRAINT library_asset_kind CHECK (kind IN ('pdf', 'image'));
INSERT INTO access_resources (key, name, description, type, "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES ('library.manage', 'Библиотека — администрирование', 'Право UPDATE разрешает добавление, изменение, перенос, удаление и восстановление книг, управление каталогом.', 'FEATURE', true, 500, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE library_books ADD COLUMN "legacyData" JSONB;

ALTER TABLE library_books ADD COLUMN "clientKey" UUID;
CREATE UNIQUE INDEX "library_books_clientKey_key" ON library_books("clientKey");
