-- CreateEnum
CREATE TYPE "TimelineType" AS ENUM ('EXPERIENCE', 'EDUCATION');

-- AlterTable
ALTER TABLE "Profile"
  ADD COLUMN "headline" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "resumeUrl" TEXT,
  ADD COLUMN "sectionConfig" JSONB;

-- AlterTable
ALTER TABLE "Skill"
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN "iconKey" TEXT,
  ADD COLUMN "isCustom" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Project"
  ADD COLUMN "coverImageUrl" TEXT,
  ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SocialLink" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineItem" (
    "id" TEXT NOT NULL,
    "type" "TimelineType" NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TimelineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Skill_userId_sortOrder_idx" ON "Skill"("userId", "sortOrder");
CREATE INDEX "Project_userId_sortOrder_idx" ON "Project"("userId", "sortOrder");
CREATE INDEX "SocialLink_userId_sortOrder_idx" ON "SocialLink"("userId", "sortOrder");
CREATE INDEX "TimelineItem_userId_type_sortOrder_idx" ON "TimelineItem"("userId", "type", "sortOrder");

-- AddForeignKey
ALTER TABLE "SocialLink" ADD CONSTRAINT "SocialLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data: keep existing content in its current order (createdAt, id) as the initial sortOrder.
UPDATE "Skill" s SET "sortOrder" = r.rn
FROM (SELECT "id", ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt", "id") - 1 AS rn FROM "Skill") r
WHERE s."id" = r."id";

UPDATE "Project" p SET "sortOrder" = r.rn
FROM (SELECT "id", ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt", "id") - 1 AS rn FROM "Project") r
WHERE p."id" = r."id";

-- Data: categories for the 16 presets (all existing skills are presets, so isCustom stays false).
UPDATE "Skill" SET "category" = CASE "name"
  WHEN 'html' THEN 'frontend' WHEN 'css' THEN 'frontend' WHEN 'javascript' THEN 'frontend'
  WHEN 'react' THEN 'frontend' WHEN 'typescript' THEN 'frontend' WHEN 'nextjs' THEN 'frontend'
  WHEN 'python' THEN 'backend' WHEN 'nodejs' THEN 'backend' WHEN 'express' THEN 'backend' WHEN 'java' THEN 'backend'
  WHEN 'postgresql' THEN 'database' WHEN 'mongodb' THEN 'database' WHEN 'prisma' THEN 'database'
  WHEN 'git' THEN 'tools' WHEN 'docker' THEN 'tools'
  ELSE 'other' END;
