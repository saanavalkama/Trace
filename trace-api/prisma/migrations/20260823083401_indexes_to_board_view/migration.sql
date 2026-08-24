/*
  Warnings:

  - You are about to drop the `IssueBoardProjection` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "IssueBoardProjection";

-- CreateTable
CREATE TABLE "issue_board_projection" (
    "issue_id" TEXT NOT NULL,
    "workplace_id" TEXT NOT NULL,
    "sprint_id" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assignee_ids" TEXT[],
    "labels" TEXT[],
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issue_board_projection_pkey" PRIMARY KEY ("issue_id")
);

-- CreateIndex
CREATE INDEX "issue_board_projection_workplace_id_status_idx" ON "issue_board_projection"("workplace_id", "status");

-- CreateIndex
CREATE INDEX "issue_board_projection_sprint_id_idx" ON "issue_board_projection"("sprint_id");
