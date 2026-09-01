import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useCreateWorkspace, useSendManyInvites } from "../hooks/workspaceMutationHook"

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
    const{mutateAsync: sendInvitesAsync, isPending: isSendInvitesPending, isError: isSendInvitesError} = useSendManyInvites()

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

    return(<div>
        <h2>Create your workspace and add members to get started</h2>
        <form onSubmit={handleSubmit}>
            <div>
                <h3>Specify name of your workspace</h3>
                <label htmlFor="name">Name</label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e)=>setName(e.target.value)}
                    />
            </div>
            <div>
                <h3>Quick add members and we will send them invite email</h3>
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                />
                <label htmlFor="role">Role</label>
                <select id="role" name="role" value={role} onChange={(e)=>setRole(e.target.value as 'admin' | 'member')}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                </select>
                <button
                    type="button"
                    onClick={handleAddEmail}
                >
                    Add member
                </button>
                <ul>
                    {invites.map((ele)=>
                    <li key={ele.email}>{ele.email}
                        <button
                            type="button"
                            onClick={()=>handleRemoveEmail(ele.email)}
                        >Remove member</button>
                    </li>)}
                </ul>
            </div>
            <button 
                type="submit"
                disabled={!name.trim()}
                >Create Workspace</button>
        </form>
    </div>)
}