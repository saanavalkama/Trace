import { createBrowserRouter } from "react-router-dom";
import LoginPage from "./features/auth/components/LoginPage";
import VerifyCodePage from "./features/auth/components/VerifyCodePage";
import ProtectedRoute from "./features/auth/components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import WorkspaceLayout from "./features/workspaces/pages/WorkspaceLayout";

// Route-level code splitting: each page below is its own chunk, fetched on navigation.
const lazyPage = (load: () => Promise<{ default: React.ComponentType }>) =>
    async () => ({ Component: (await load()).default });

export const router = createBrowserRouter([
    {path: '/', element:<HomePage />},
    {path: '/login', element:<LoginPage />},
    {path: '/verifyCode', element:<VerifyCodePage />},
    {
        element: <ProtectedRoute />,
        children: [
            {path: '/workspaces', lazy: lazyPage(() => import("./features/workspaces/pages/Workspaces"))},
            {path: '/workspaces/create', lazy: lazyPage(() => import("./features/workspaces/components/CreateWorkspaceForm"))},
            {
                path: '/workspaces/:workspaceId',
                element:<WorkspaceLayout />,
                children:[
                    {index:true, lazy: lazyPage(() => import("./features/workspaces/pages/WorkspaceOverview"))},
                    {path:'info', lazy: lazyPage(() => import("./features/workspaces/pages/WorkspaceInfo"))},
                    {path:'sprints/create', lazy: lazyPage(() => import("./features/sprints/components/CreateSprintForm"))},
                    {
                        path:'sprints/:sprintId',
                        lazy: lazyPage(() => import("./features/board/components/BoardView")),
                        children:[
                            {path:'issues/create', lazy: lazyPage(() => import("./features/board/components/CreateIssueForm"))}
                        ]
                    },
                    {path:'issues/:issueId', lazy: lazyPage(() => import("./features/issues/components/IssueDetail"))},
                    {path:'settings', lazy: lazyPage(() => import("./features/workspaces/pages/WorkspaceSettings"))}
                ]
            }
        ]
    }
])
