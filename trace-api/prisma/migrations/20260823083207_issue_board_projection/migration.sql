-- CreateTable
CREATE TABLE "IssueBoardProjection" (
    "issue_id" TEXT NOT NULL,
    "workplace_id" TEXT NOT NULL,
    "sprint_id" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assignee_ids" TEXT[],
    "labels" TEXT[],
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueBoardProjection_pkey" PRIMARY KEY ("issue_id")
);
