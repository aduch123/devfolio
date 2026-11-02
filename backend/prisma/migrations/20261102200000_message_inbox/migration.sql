ALTER TABLE "Profile" ADD COLUMN "emailNotifications" BOOLEAN NOT NULL DEFAULT true;
CREATE TYPE "MessageStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');
CREATE TABLE "Message" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "senderName" TEXT NOT NULL,
  "senderEmail" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "MessageStatus" NOT NULL DEFAULT 'UNREAD',
  "notificationState" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Message_userId_createdAt_idx" ON "Message"("userId", "createdAt");
CREATE INDEX "Message_userId_status_idx" ON "Message"("userId", "status");
