/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `workplace_invites` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "InvateStatus" ADD VALUE 'declined';

-- CreateIndex
CREATE UNIQUE INDEX "workplace_invites_token_key" ON "workplace_invites"("token");
