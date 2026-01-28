import { Outlet } from "react-router-dom";
import SideNav from "../components/SideNav";

export default function AppLayout() {
    return (
        <div style={{ display: "flex", height: "100vh" }}>
            <aside
                style={{
                    width: 280,
                    borderRight: "1px solid #2a2a2a",
                    padding: 16,
                    background: "#121212",
                    color: "#eaeaea",
                }}
            >
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 12 }}>CS_DOC</div>
                <SideNav />
            </aside>

            <main style={{ flex: 1, padding: 20, background: "#0f0f0f", color: "#eaeaea" }}>
                <Outlet />
            </main>
        </div>
    );
}
