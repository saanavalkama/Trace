/*
  Warnings:

  - You are about to drop the column `body` on the `issue_activity_projection` table. All the data in the column will be lost.
  - You are about to drop the column `comment_id` on the `issue_activity_projection` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `issue_activity_projection` table. All the data in the column will be lost.
  - Added the required column `payload` to the `issue_activity_projection` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "issue_activity_projection" DROP COLUMN "body",
DROP COLUMN "comment_id",
DROP COLUMN "summary",
ADD COLUMN     "payload" JSONB NOT NULL;

-- CreateTable
CREATE TABLE "issue_snapshots" (
    "id" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL DEFAULT 'Issue',
    "version" INTEGER NOT NULL,
    "state" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issue_snapshots_aggregate_id_idx" ON "issue_snapshots"("aggregate_id");

-- CreateIndex
CREATE UNIQUE INDEX "issue_snapshots_aggregate_id_version_key" ON "issue_snapshots"("aggregate_id", "version");
