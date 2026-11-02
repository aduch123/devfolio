CREATE TABLE "LinkCheck" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "url" TEXT NOT NULL, "sourceType" TEXT NOT NULL, "sourceId" TEXT NOT NULL, "label" TEXT NOT NULL, "fix" TEXT NOT NULL,
 "status" TEXT NOT NULL, "httpStatus" INTEGER, "reason" TEXT, "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "LinkCheck_userId_sourceType_sourceId_key" ON "LinkCheck"("userId","sourceType","sourceId");
CREATE TABLE "HealthSnapshot" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "score" INTEGER NOT NULL, "categories" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "HealthSnapshot_userId_createdAt_idx" ON "HealthSnapshot"("userId","createdAt");
CREATE TABLE "HealthDismissal" (
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE, "key" TEXT NOT NULL, PRIMARY KEY("userId","key")
);
