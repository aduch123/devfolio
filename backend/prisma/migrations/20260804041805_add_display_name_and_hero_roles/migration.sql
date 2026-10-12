/*
  Warnings:

  - You are about to drop the column `heroRoleText` on the `Profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "heroRoleText",
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "heroRoleTexts" TEXT[];
