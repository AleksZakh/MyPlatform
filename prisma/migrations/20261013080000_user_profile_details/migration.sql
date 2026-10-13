CREATE TABLE "user_profiles" (
 "userId" INTEGER PRIMARY KEY REFERENCES "app_users"("id") ON DELETE CASCADE,
 "nickname" VARCHAR(80) NOT NULL DEFAULT '',
 "contactEmail" VARCHAR(255) NOT NULL DEFAULT '',
 "additionalEmail" VARCHAR(255) NOT NULL DEFAULT '',
 "phone" VARCHAR(50) NOT NULL DEFAULT '',
 "postalAddress" VARCHAR(500) NOT NULL DEFAULT '',
 "about" VARCHAR(1000) NOT NULL DEFAULT '',
 "avatar" BYTEA,
 "avatarVersion" VARCHAR(36),
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "user_profiles_avatar_size" CHECK (octet_length("avatar") <= 524288)
);
