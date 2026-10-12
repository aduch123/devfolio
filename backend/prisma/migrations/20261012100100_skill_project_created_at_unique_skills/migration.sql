-- AlterTable
ALTER TABLE "Skill" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Remove duplicate skills per user (case-insensitive), keeping the oldest (ties: smallest id).
DELETE FROM "Skill" s
USING "Skill" d
WHERE s."userId" = d."userId"
  AND lower(s."name") = lower(d."name")
  AND (s."createdAt" > d."createdAt" OR (s."createdAt" = d."createdAt" AND s."id" > d."id"));

-- One skill per user, case-insensitive (Prisma cannot express this in schema.prisma).
CREATE UNIQUE INDEX "Skill_userId_lower_name_key" ON "Skill" ("userId", lower("name"));
