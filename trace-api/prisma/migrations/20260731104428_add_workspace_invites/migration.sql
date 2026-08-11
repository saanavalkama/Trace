-- CreateEnum
CREATE TYPE "InvateStatus" AS ENUM ('pending', 'accepted', 'expired');

-- DropForeignKey
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_user_id_fkey";

-- DropForeignKey
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_workspace_id_fkey";

-- AlterTable
ALTER TABLE "login_codes" ADD COLUMN     "invite_token" TEXT;

-- CreateTable
CREATE TABLE "workplace_invites" (
    "id" TEXT NOT NULL,
    "workplace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvateStatus" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workplace_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workplace_invites_email_idx" ON "workplace_invites"("email");

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workplace_invites" ADD CONSTRAINT "workplace_invites_workplace_id_fkey" FOREIGN KEY ("workplace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
