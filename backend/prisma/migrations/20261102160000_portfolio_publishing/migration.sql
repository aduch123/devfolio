ALTER TABLE "Profile" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "publishedAt" TIMESTAMP(3);

UPDATE "Profile" SET "published" = true, "publishedAt" = CURRENT_TIMESTAMP
FROM "User" WHERE "Profile"."userId" = "User"."id"
AND "User"."onboardingComplete" = true AND "User"."deletedAt" IS NULL;
