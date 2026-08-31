import { Link } from "react-router-dom";
import { useMyWorkspaces } from "../hooks/workspaceQueryHooks";

export default function WorkspaceList(){
    const {data:workspaces,isPending, isError} = useMyWorkspaces()

    if(isPending) return <div>Loading...</div>
    if(isError) return <div>Something went wrong</div>

    return(
        <div>
        <ul>
            {workspaces?.map(workspace => 
            <li key={workspace.id}>
                <Link to={`workspaces/${workspace.id}`}>
                    <p>{workspace.name}</p>
                    <p>{workspace.role}</p>
                </Link>
                
                {(workspace.role === 'admin' || workspace.role === 'owner') && 
                    <Link to={`workspaces/${workspace.id}/settings`}>settings</Link>}
            </li>)}
        </ul>
        <Link to="/workspaces/create">+ Add Workspace</Link>
        </div>
    )
}