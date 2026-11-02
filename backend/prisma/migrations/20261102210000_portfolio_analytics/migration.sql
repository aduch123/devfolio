ALTER TABLE "ShareLink" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "View" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "visitorHash" TEXT NOT NULL, "referrerHost" TEXT, "deviceType" TEXT NOT NULL,
 "shareLinkId" TEXT REFERENCES "ShareLink"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "windowStart" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "View_userId_visitorHash_windowStart_key" ON "View"("userId", "visitorHash", "windowStart");
CREATE INDEX "View_userId_createdAt_idx" ON "View"("userId", "createdAt");
CREATE TABLE "Like" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "visitorHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Like_userId_visitorHash_key" ON "Like"("userId", "visitorHash");
CREATE INDEX "Like_userId_createdAt_idx" ON "Like"("userId", "createdAt");
CREATE TABLE "ClickEvent" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "visitorHash" TEXT NOT NULL, "targetType" TEXT NOT NULL, "targetId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ClickEvent_userId_createdAt_idx" ON "ClickEvent"("userId", "createdAt");
CREATE TABLE "DailyMetric" (
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE, "day" DATE NOT NULL,
 "views" INTEGER NOT NULL, "uniqueVisitors" INTEGER NOT NULL, "sources" JSONB NOT NULL, "devices" JSONB NOT NULL,
 PRIMARY KEY ("userId", "day")
);
