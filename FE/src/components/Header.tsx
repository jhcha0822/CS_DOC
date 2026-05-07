import { getCurrentUser, logout } from "../lib/auth";
import { SITE_NAME } from "../lib/site";
import NotificationBell from "./NotificationBell";
import ShortcutMenus from "./ShortcutMenus";

export default function Header() {
    const user = getCurrentUser();

    if (!user) {
        return null;
    }

    return (
        <header
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                height: 64,
                backgroundColor: "#ffffff",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 24px",
                zIndex: 1000,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
            }}
        >
            {/* 좌측: 로고 */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                    style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: "#111827",
                        letterSpacing: "-0.02em",
                    }}
                >
                    {SITE_NAME}
                </div>
            </div>

            {/* 우측: 알림 종 + 사용자 정보 및 액션 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <ShortcutMenus compact />
                <NotificationBell />
                {/* 사용자 이름 */}
                <span
                    style={{
                        fontSize: 14,
                        color: "#111827",
                        fontWeight: 500,
                    }}
                >
                    {user.name || user.username}
                </span>

                {/* 로그아웃 버튼 */}
                <button
                    onClick={() => {
                        if (window.confirm("로그아웃하시겠습니까?")) {
                            logout();
                        }
                    }}
                    style={{
                        padding: "6px 12px",
                        fontSize: 13,
                        color: "#374151",
                        backgroundColor: "#f3f4f6",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                    }}
                >
                    로그아웃
                </button>
            </div>
        </header>
    );
}
