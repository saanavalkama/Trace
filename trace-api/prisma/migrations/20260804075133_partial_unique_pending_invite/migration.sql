-- Fix drift: the enum type was created as "InvateStatus" (typo) while
-- schema.prisma has always declared it as "InviteStatus". Rename instead of
-- the drop/recreate Prisma would otherwise generate, since that would reset
-- every row's status column to its default.
ALTER TYPE "InvateStatus" RENAME TO "InviteStatus";

-- Enforce at most one pending invite per (workspace, email) so concurrent
-- invite requests can't both pass the application-level duplicate check.
CREATE UNIQUE INDEX "workplace_invites_workplace_id_email_pending_key"
ON "workplace_invites" ("workplace_id", "email")
WHERE "status" = 'pending';
