import { Link } from "react-router-dom"
import { Loader2, LogOut } from "lucide-react"
import { useAuthStore } from "@/features/auth/store/authStore"
import { useLogout } from "@/features/auth/hooks/mutations/authMutationHooks"
import { Button } from "@/components/ui/button"

export default function Navbar() {
    const user = useAuthStore((state) => state.user)
    const { mutate: logout, isPending } = useLogout()

    return (
        <nav className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
            <Link to="/workspaces" className="text-lg font-semibold text-foreground">
                Trace
            </Link>

            <div className="flex items-center gap-3">
                {user && (
                    <span className="text-sm text-muted-foreground">
                        You are logged in as <span className="font-medium text-foreground">{user.email}</span>
                    </span>
                )}
                <Button variant="outline" size="sm" onClick={() => logout()} disabled={isPending}>
                    {isPending ? <Loader2 className="animate-spin" /> : <LogOut />}
                    {isPending ? "Logging out..." : "Logout"}
                </Button>
            </div>
        </nav>
    )
}
