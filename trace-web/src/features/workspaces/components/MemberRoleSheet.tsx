import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { useUpdateMemberRole } from "../hooks/workspaceMutationHook"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import type { WorkspaceMember } from "@/types/types"

interface MemberRoleSheetProps {
    workspaceId: string
    member: WorkspaceMember
}

export default function MemberRoleSheet({ workspaceId, member }: MemberRoleSheetProps) {
    const [open, setOpen] = useState(false)
    const [role, setRole] = useState<"admin" | "member">(
        member.role === "owner" ? "admin" : member.role
    )

    const { mutate, isPending, isError } = useUpdateMemberRole()

    function handleOpenChange(nextOpen: boolean) {
        setOpen(nextOpen)
        if (!nextOpen) {
            setRole(member.role === "owner" ? "admin" : member.role)
        }
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault()
        mutate(
            { workspaceId, userId: member.userId, role },
            { onSuccess: () => handleOpenChange(false) }
        )
    }

    if (member.role === "owner") {
        return (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-card-foreground">
                <span className="min-w-0 truncate text-sm">{member.user.email}</span>
                <Badge variant="secondary" className="shrink-0 capitalize">
                    {member.role}
                </Badge>
            </div>
        )
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <button
                    type="button"
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-left text-card-foreground transition-colors hover:bg-muted"
                >
                    <span className="min-w-0 truncate text-sm">{member.user.email}</span>
                    <Badge variant="secondary" className="shrink-0 capitalize">
                        {member.role}
                    </Badge>
                </button>
            </SheetTrigger>
            <SheetContent className="flex flex-col">
                <form onSubmit={handleSubmit} className="flex h-full flex-col">
                    <SheetHeader>
                        <SheetTitle>Change role</SheetTitle>
                        <SheetDescription>
                            Update {member.user.email}&apos;s role in this workspace.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="member-role-select">Role</Label>
                            <Select value={role} onValueChange={(value) => setRole(value as "admin" | "member")}>
                                <SelectTrigger id="member-role-select" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {isError && (
                            <p className="text-sm text-destructive">
                                Something went wrong updating the role. Please try again.
                            </p>
                        )}
                    </div>

                    <SheetFooter>
                        <Button type="submit" className="w-full" disabled={role === member.role || isPending}>
                            {isPending && <Loader2 className="animate-spin" />}
                            {isPending ? "Saving..." : "Save"}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
