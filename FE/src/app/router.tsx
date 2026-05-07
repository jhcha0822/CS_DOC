import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout.tsx";
import LoginPage from "../pages/LoginPage";
import SignUpPage from "../pages/SignUpPage";
import PostListPage from "../pages/PostListPage";
import PostDetailPage from "../pages/PostDetailPage";
import PostEditorPage from "../pages/PostEditorPage";
import CategoryManagePage from "../pages/CategoryManagePage";
import PostVersionHistoryPage from "../pages/PostVersionHistoryPage";
import PostVersionDetailPage from "../pages/PostVersionDetailPage";
import AssignmentPage from "../pages/AssignmentPage";
import MemoPage from "../pages/MemoPage";
import UserManagePage from "../pages/UserManagePage";
import AssignmentGradesPage from "../pages/AssignmentGradesPage";
import AdminContentStatsPage from "../pages/AdminContentStatsPage";
import AdminShortcutsPage from "../pages/AdminShortcutsPage";

export const router = createBrowserRouter([
    { path: "/", element: <Navigate to="/login" replace /> },
    { path: "/login", element: <LoginPage /> },
    { path: "/signup", element: <SignUpPage /> },
    {
        path: "/",
        element: <AppLayout />,
        children: [
            { path: "posts", element: <PostListPage /> },
            { path: "posts/new", element: <PostEditorPage /> },
            { path: "posts/:id", element: <PostDetailPage /> },
            { path: "posts/:id/assignment", element: <AssignmentPage /> },
            { path: "posts/:id/edit", element: <PostEditorPage /> },
            { path: "categories/manage", element: <CategoryManagePage /> },
            { path: "posts/versions", element: <PostVersionHistoryPage /> },
            { path: "posts/:postId/versions/:versionNumber", element: <PostVersionDetailPage /> },
            { path: "memos", element: <MemoPage /> },
            { path: "users/manage", element: <UserManagePage /> },
            { path: "admin/assignment-grades", element: <AssignmentGradesPage /> },
            { path: "admin/content-stats", element: <AdminContentStatsPage /> },
            { path: "admin/shortcuts", element: <AdminShortcutsPage /> },
        ],
    },
]);
