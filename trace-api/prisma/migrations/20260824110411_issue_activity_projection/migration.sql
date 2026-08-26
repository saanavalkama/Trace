-- CreateTable
CREATE TABLE "issue_activity_projection" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "comment_id" TEXT,
    "body" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issue_activity_projection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issue_activity_projection_issue_id_created_at_idx" ON "issue_activity_projection"("issue_id", "created_at");
