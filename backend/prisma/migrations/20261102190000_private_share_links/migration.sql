CREATE TABLE "ShareLink" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tokenHash" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ShareLink_tokenHash_key" ON "ShareLink"("tokenHash");
CREATE INDEX "ShareLink_userId_createdAt_idx" ON "ShareLink"("userId", "createdAt");
INSERT INTO "ShareLink" ("id", "userId", "tokenHash", "label")
SELECT md5('legacy-share:' || "id"), "id", encode(sha256(convert_to("shareToken", 'UTF8')), 'hex'), 'Legacy link'
FROM "User" WHERE "shareToken" IS NOT NULL;
ALTER TABLE "User" DROP COLUMN "shareToken";
