import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../lib/api";
import { setCurrentUser } from "../lib/auth";
import { ApiError } from "../lib/api";
import ErrorModal from "../components/ErrorModal";

export default function LoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const id = username.trim();
        if (!id || !password) {
            setError("아이디와 비밀번호를 입력하세요.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const user = await login(id, password);
            setCurrentUser({
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
            });
            navigate("/posts");
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "로그인에 실패했습니다.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
            }}
        >
            <div
                style={{
                    transform: "scale(1.5)",
                    transformOrigin: "center center",
                    maxWidth: 400,
                    width: "100%",
                    padding: 40,
                }}
            >
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 32, background: "#fff" }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, textAlign: "center" }}>로그인</h1>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>아이디</span>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="아이디"
                            autoComplete="username"
                            disabled={loading}
                            style={{
                                padding: "10px 12px",
                                border: "1px solid #d1d5db",
                                borderRadius: 8,
                                fontSize: 14,
                            }}
                        />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>비밀번호</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호"
                            autoComplete="current-password"
                            disabled={loading}
                            style={{
                                padding: "10px 12px",
                                border: "1px solid #d1d5db",
                                borderRadius: 8,
                                fontSize: 14,
                            }}
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: "12px 16px",
                            borderRadius: 8,
                            border: "none",
                            background: "#2563eb",
                            color: "#fff",
                            fontSize: 16,
                            fontWeight: 600,
                            cursor: loading ? "not-allowed" : "pointer",
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? "로그인 중..." : "로그인"}
                    </button>
                </form>
                <p style={{ marginTop: 20, textAlign: "center", fontSize: 14 }}>
                    <Link to="/signup" style={{ color: "#2563eb", textDecoration: "underline" }}>
                        회원가입
                    </Link>
                </p>
                </div>
            </div>
            <ErrorModal open={!!error} message={error ?? ""} onClose={() => setError(null)} />
        </div>
    );
}
