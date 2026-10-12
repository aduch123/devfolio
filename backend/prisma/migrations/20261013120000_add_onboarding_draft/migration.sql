-- CreateTable
CREATE TABLE "OnboardingDraft" (
    "id" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL DEFAULT '{}',
    "skipped" INTEGER[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "OnboardingDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingDraft_userId_key" ON "OnboardingDraft"("userId");

-- AddForeignKey
ALTER TABLE "OnboardingDraft" ADD CONSTRAINT "OnboardingDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
