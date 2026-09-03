import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, X } from "lucide-react"
import { useCreateWorkspace, useSendManyInvites } from "../hooks/workspaceMutationHook"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export default function CreateWorkspaceForm(){

    interface PendingInvite{
        email:string,
        role:'admin' | 'member'
    }

    const [name, setName] = useState('')
    const [invites, setInvites] = useState<PendingInvite[]>([])
    const [email, setEmail] = useState('')
    const [role,setRole] = useState<"admin" | "member">('member')

    const navigate = useNavigate()
    const {mutate, isPending, isError} = useCreateWorkspace()
    const {mutateAsync: sendInvitesAsync} = useSendManyInvites()

    function handleSubmit(e:React.FormEvent){
        e.preventDefault()
        mutate({name},{
            onSuccess: async(workspace) => {
                if(invites.length > 0){
                    try{
                        await sendInvitesAsync({workspaceId:workspace.id, invites})
                    } catch(err) {
                        console.log(err)
                    }
                }
                navigate(`/workspaces/${workspace.id}`)
            }
        })

    }

    function handleAddEmail(){
        const cleanedEmail = email.trim().toLowerCase()
        if(!cleanedEmail) return
        if(invites.some(ele => ele.email === cleanedEmail))return
        setInvites((prev)=>[...prev, {email:cleanedEmail, role}])
        setEmail('')
        setRole('member')
    }

    function handleRemoveEmail(email:string){
        setInvites((prev)=>prev.filter(e => e.email !== email))
    }

    return(
        <div className="flex min-h-svh items-center justify-center px-4 py-12">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-xl">Create your workspace</CardTitle>
                    <CardDescription>Give it a name and add members to get started.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="name">Workspace name</Label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="Acme Inc"
                                value={name}
                                onChange={(e)=>setName(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <Label>Invite members</Label>
                                <p className="text-sm text-muted-foreground">
                                    We&apos;ll send them an invite email once the workspace is created.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Label htmlFor="email" className="sr-only">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="teammate@company.com"
                                    value={email}
                                    onChange={(e)=>setEmail(e.target.value)}
                                    className="flex-1"
                                />
                                <Label htmlFor="role" className="sr-only">Role</Label>
                                <Select value={role} onValueChange={(value)=>setRole(value as 'admin' | 'member')}>
                                    <SelectTrigger id="role" className="w-28">
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

                            {invites.length > 0 && (
                                <ul className="flex flex-col gap-2">
                                    {invites.map((ele)=>(
                                        <li
                                            key={ele.email}
                                            className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="truncate text-sm">{ele.email}</span>
                                                <Badge variant="secondary" className="capitalize">{ele.role}</Badge>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-7 shrink-0"
                                                onClick={()=>handleRemoveEmail(ele.email)}
                                            >
                                                <X className="size-4" />
                                                <span className="sr-only">Remove {ele.email}</span>
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {isError && (
                            <p className="text-sm text-destructive">
                                Something went wrong creating your workspace. Please try again.
                            </p>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={!name.trim() || isPending}>
                            {isPending && <Loader2 className="animate-spin" />}
                            {isPending ? 'Creating workspace...' : 'Create workspace'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
