import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout.tsx";
import LoginPage from "../pages/LoginPage";
import PostListPage from "../pages/PostListPage";
import PostDetailPage from "../pages/PostDetailPage";
import PostEditorPage from "../pages/PostEditorPage";
import CategoryManagePage from "../pages/CategoryManagePage";
import PostVersionHistoryPage from "../pages/PostVersionHistoryPage";

export const router = createBrowserRouter([
    { path: "/", element: <Navigate to="/posts" replace /> },
    { path: "/login", element: <LoginPage /> },
    {
        path: "/",
        element: <AppLayout />,
        children: [
            { path: "posts", element: <PostListPage /> },
            { path: "posts/new", element: <PostEditorPage /> },
            { path: "posts/:id", element: <PostDetailPage /> },
            { path: "posts/:id/edit", element: <PostEditorPage /> },
            { path: "categories/manage", element: <CategoryManagePage /> },
            { path: "posts/versions", element: <PostVersionHistoryPage /> },
        ],
    },
]);
