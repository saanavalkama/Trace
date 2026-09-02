import { createBrowserRouter } from "react-router-dom";
import LoginPage from "./features/auth/components/LoginPage";
import VerifyCodePage from "./features/auth/components/VerifyCodePage";
import HomePage from "./pages/HomePage";
import Workspaces from "./features/workspaces/pages/Workspaces";
import CreateWorkspaceForm from "./features/workspaces/components/CreateWorkspaceForm";
import WorkspaceLayout from "./features/workspaces/pages/WorkspaceLayout";
import CreateSprintForm from "./features/sprints/components/CreateSprintForm";
import BoardView from "./features/board/components/BoardView";

export const router = createBrowserRouter([
    {path: '/', element:<HomePage />},
    {path: '/login', element:<LoginPage />},
    {path: '/verifyCode', element:<VerifyCodePage />},
    {path: '/workspaces', element: <Workspaces />},
    {path: '/workspaces/create', element: <CreateWorkspaceForm />},
    {
        path: '/workspaces/:workspaceId',
        element:<WorkspaceLayout />,
        children:[
            {index:true, element:<p>coming</p>},
            {path:'sprints/create', element:<CreateSprintForm />},
            {path:'sprints/:sprintId', element:<BoardView />},
            {path:'settings', element:<p>coming</p>}
        ]
    }
])