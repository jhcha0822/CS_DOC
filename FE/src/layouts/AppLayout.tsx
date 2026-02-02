import { Outlet } from "react-router-dom";
import SideNav from "../components/SideNav";

export default function AppLayout() {
    return (
        <div
            className="app-layout"
            style={{
                width: "100vw",
                minHeight: "100vh",
                height: "100%",
                overflow: "hidden",
                boxSizing: "border-box",
                background: "var(--app-bg)",
            }}
        >
            <aside
                style={{
                    position: "fixed",
                    left: 0,
                    top: 0,
                    width: 280,
                    height: "100vh",
                    borderRight: "1px solid var(--app-border)",
                    padding: 16,
                    background: "var(--app-bg-sidebar)",
                    color: "var(--app-text)",
                    overflowY: "auto",
                    boxSizing: "border-box",
                }}
            >
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 12 }}>CS_DOC</div>
                <SideNav />
            </aside>

            <main
                style={{
                    marginLeft: 280,
                    width: "calc(100vw - 280px)",
                    maxWidth: "calc(100vw - 280px)",
                    height: "100vh",
                    padding: 16,
                    background: "var(--app-bg)",
                    color: "var(--app-text)",
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
