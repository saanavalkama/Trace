import { createBrowserRouter } from "react-router-dom";
import LoginPage from "./features/auth/components/LoginPage";
import VerifyCodePage from "./features/auth/components/VerifyCodePage";
import HomePage from "./pages/HomePage";

export const router = createBrowserRouter([
    {path: '/', element:<HomePage />},
    {path: '/login', element:<LoginPage />},
    {path: '/verifyCode', element:<VerifyCodePage />}
])