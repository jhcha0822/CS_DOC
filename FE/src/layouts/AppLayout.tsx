import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import SideNav from "../components/SideNav";
import Header from "../components/Header";
import { getCurrentUser } from "../lib/auth";

export default function AppLayout() {
    const navigate = useNavigate();

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) {
            navigate("/login", { replace: true });
        }
    }, [navigate]);

    const user = getCurrentUser();
    if (!user) {
        return null; // 리다이렉트 중
    }

    return (
        <div
            className="app-layout"
            style={{
                width: "100vw",
                minHeight: "100vh",
                height: "100%",
                overflow: "hidden",
                boxSizing: "border-box",
                background: "#ffffff",
            }}
        >
            {/* 상단 헤더 */}
            <Header />

            {/* 사이드바 */}
            <aside
                style={{
                    position: "fixed",
                    left: 0,
                    top: 64, // 헤더 높이만큼 아래로
                    width: 240,
                    height: "calc(100vh - 64px)",
                    borderRight: "1px solid #e5e7eb",
                    padding: "16px 8px",
                    background: "#ffffff",
                    color: "#111827",
                    overflowY: "auto",
                    boxSizing: "border-box",
                }}
            >
                <SideNav />
            </aside>

            {/* 메인 콘텐츠 영역 */}
            <main
                style={{
                    marginLeft: 240,
                    marginTop: 64, // 헤더 높이만큼 아래로
                    width: "calc(100vw - 240px)",
                    maxWidth: "calc(100vw - 240px)",
                    height: "calc(100vh - 64px)",
                    padding: 24,
                    background: "#ffffff",
                    color: "#111827",
                    overflow: "auto",
                    overflowX: "hidden",
                    boxSizing: "border-box",
                }}
            >
                <Outlet />
            </main>
        </div>
    );
}
