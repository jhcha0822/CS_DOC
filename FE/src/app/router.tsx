import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout.tsx";
import LoginPage from "../pages/LoginPage";
import PostListPage from "../pages/PostListPage";
import PostDetailPage from "../pages/PostDetailPage";
import PostEditorPage from "../pages/PostEditorPage";
import CategoryManagePage from "../pages/CategoryManagePage";
import PostVersionHistoryPage from "../pages/PostVersionHistoryPage";
import PostVersionDetailPage from "../pages/PostVersionDetailPage";
import MemoPage from "../pages/MemoPage";
import UserManagePage from "../pages/UserManagePage";

export const router = createBrowserRouter([
    { path: "/", element: <Navigate to="/login" replace /> },
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
            { path: "posts/:postId/versions/:versionNumber", element: <PostVersionDetailPage /> },
            { path: "memos", element: <MemoPage /> },
            { path: "users/manage", element: <UserManagePage /> },
        ],
    },
]);
