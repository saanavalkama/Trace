import { createBrowserRouter } from "react-router-dom";
import LoginPage from "./features/auth/components/LoginPage";
import VerifyCodePage from "./features/auth/components/VerifyCodePage";
import HomePage from "./pages/HomePage";
import Workspaces from "./features/workspaces/pages/Workspaces";
import CreateWorkspaceForm from "./features/workspaces/components/CreateWorkspaceForm";

export const router = createBrowserRouter([
    {path: '/', element:<HomePage />},
    {path: '/login', element:<LoginPage />},
    {path: '/verifyCode', element:<VerifyCodePage />},
    {path: '/workspaces', element: <Workspaces />},
    {path: '/workspaces/create', element: <CreateWorkspaceForm />}
])