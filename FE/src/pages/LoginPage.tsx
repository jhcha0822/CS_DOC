import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUsers, type UserItem } from "../lib/api";
import { setCurrentUser } from "../lib/auth";
import { ApiError } from "../lib/api";

export default function LoginPage() {
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadUsers() {
            try {
                const list = await fetchUsers();
                setUsers(list || []);
            } catch (e) {
                const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "사용자 목록을 불러오지 못했습니다.";
                setError(msg);
            } finally {
                setLoading(false);
            }
        }
        loadUsers();
    }, []);

    const handleLogin = (user: UserItem) => {
        // UserItem을 UserInfo로 변환 (name 포함)
        setCurrentUser({
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
        });
        navigate("/posts");
    };

    return (
        <div style={{ maxWidth: 500, padding: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>사용자 선택</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 20 }}>
                사용자를 선택하여 로그인하세요.
            </div>

            {error && (
                <div style={{ padding: 12, marginBottom: 16, background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div style={{ padding: 20, textAlign: "center" }}>불러오는 중...</div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {users.map((user) => (
                        <button
                            key={user.id}
                            onClick={() => handleLogin(user)}
                            style={{
                                padding: "12px 16px",
                                borderRadius: 10,
                                border: "1px solid #444",
                                background: "#fff",
                                color: "#111",
                                fontWeight: 600,
                                cursor: "pointer",
                                textAlign: "left",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <span>{user.username}</span>
                            <span style={{
                                padding: "4px 8px",
                                borderRadius: 4,
                                background: user.role === "ADMIN" ? "#dbeafe" : "#f3f4f6",
                                color: user.role === "ADMIN" ? "#1e40af" : "#374151",
                                fontSize: 12,
                                fontWeight: 600,
                            }}>
                                {user.role}
                            </span>
                        </button>
                    ))}
                    {users.length === 0 && (
                        <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
                            등록된 사용자가 없습니다. 사용자 관리 페이지에서 사용자를 추가하세요.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
