import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, X } from "lucide-react"
import { useGetMembers, useMyWorkspaces } from "../hooks/workspaceQueryHooks"
import { useSendManyInvites } from "../hooks/workspaceMutationHook"
import MemberRoleSheet from "../components/MemberRoleSheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import type { PendingInvites, SendManyInvitesResult } from "@/types/types"

export default function WorkspaceSettings() {
    const { workspaceId } = useParams<{ workspaceId: string }>()

    const { data: workspaces } = useMyWorkspaces()
    const workspace = workspaces?.find((w) => w.id === workspaceId)

    const { data: members, isPending: membersPending, isError: membersError } = useGetMembers(workspaceId!)
    const { mutate: sendInvites, isPending: sendingInvites, isError: sendInvitesError } = useSendManyInvites()

    const [pendingInvites, setPendingInvites] = useState<PendingInvites[]>([])
    const [email, setEmail] = useState("")
    const [role, setRole] = useState<"admin" | "member">("member")
    const [result, setResult] = useState<SendManyInvitesResult | null>(null)

    function handleAddEmail() {
        const cleanedEmail = email.trim().toLowerCase()
        if (!cleanedEmail) return
        if (pendingInvites.some((invite) => invite.email === cleanedEmail)) return
        setPendingInvites((prev) => [...prev, { email: cleanedEmail, role }])
        setEmail("")
        setRole("member")
    }

    function handleRemoveEmail(email: string) {
        setPendingInvites((prev) => prev.filter((invite) => invite.email !== email))
    }

    function handleSendInvites() {
        if (pendingInvites.length === 0) return
        setResult(null)
        sendInvites(
            { workspaceId: workspaceId!, invites: pendingInvites },
            {
                onSuccess: (data) => {
                    setResult(data)
                    setPendingInvites((prev) =>
                        prev.filter((invite) => !data.succeeded.some((s) => s.email === invite.email))
                    )
                },
            }
        )
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-1">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon-sm">
                    <Link to="/workspaces" aria-label="Back to workspaces">
                        <ArrowLeft />
                    </Link>
                </Button>
                <h2 className="text-xl font-semibold text-foreground">
                    {workspace?.name ?? "Workspace settings"}
                </h2>
            </div>

            <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-foreground">Members</h3>
                <p className="text-sm text-muted-foreground">
                    Click a member to change their role.
                </p>

                {membersPending && (
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                )}

                {membersError && (
                    <p className="text-sm text-destructive">Failed to load members.</p>
                )}

                {!membersPending && !membersError && members?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No members yet</p>
                )}

                <div className="flex flex-col gap-2">
                    {members?.map((member) => (
                        <MemberRoleSheet key={member.id} workspaceId={workspaceId!} member={member} />
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-medium text-foreground">Add team members</h3>
                    <p className="text-sm text-muted-foreground">
                        We&apos;ll send them an invite email.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Label htmlFor="invite-email" className="sr-only">Email</Label>
                    <Input
                        id="invite-email"
                        name="email"
                        type="email"
                        placeholder="teammate@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1"
                    />
                    <Label htmlFor="invite-role" className="sr-only">Role</Label>
                    <Select value={role} onValueChange={(value) => setRole(value as "admin" | "member")}>
                        <SelectTrigger id="invite-role" className="w-28">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button type="button" variant="secondary" onClick={handleAddEmail}>
                        Add
                    </Button>
                </div>

                {pendingInvites.length > 0 && (
                    <ul className="flex flex-col gap-2">
                        {pendingInvites.map((invite) => (
                            <li
                                key={invite.email}
                                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="truncate text-sm">{invite.email}</span>
                                    <Badge variant="secondary" className="capitalize">{invite.role}</Badge>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 shrink-0"
                                    onClick={() => handleRemoveEmail(invite.email)}
                                >
                                    <X className="size-4" />
                                    <span className="sr-only">Remove {invite.email}</span>
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}

                {sendInvitesError && (
                    <p className="text-sm text-destructive">
                        Something went wrong sending invites. Please try again.
                    </p>
                )}

                {result && (
                    <div className="flex flex-col gap-1 text-sm">
                        {result.succeeded.length > 0 && (
                            <p className="text-muted-foreground">
                                Invited: {result.succeeded.map((s) => s.email).join(", ")}
                            </p>
                        )}
                        {result.failed.length > 0 && (
                            <p className="text-destructive">
                                Failed: {result.failed.map((f) => `${f.email} (${f.reason})`).join(", ")}
                            </p>
                        )}
                    </div>
                )}

                <Button
                    type="button"
                    className="w-fit"
                    disabled={pendingInvites.length === 0 || sendingInvites}
                    onClick={handleSendInvites}
                >
                    {sendingInvites ? "Sending..." : "Send invites"}
                </Button>
            </div>
        </div>
    )
}
