import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout.tsx";
import LoginPage from "../pages/LoginPage";
import PostListPage from "../pages/PostListPage";
import PostDetailPage from "../pages/PostDetailPage";
import PostEditorPage from "../pages/PostEditorPage";

export const router = createBrowserRouter([
    { path: "/", element: <Navigate to="/posts?category=newbie" replace /> },
    { path: "/login", element: <LoginPage /> },
    {
        path: "/",
        element: <AppLayout />,
        children: [
            { path: "posts", element: <PostListPage /> },
            { path: "posts/new", element: <PostEditorPage /> },
            { path: "posts/:id", element: <PostDetailPage /> },
            { path: "posts/:id/edit", element: <PostEditorPage /> },
        ],
    },
]);
