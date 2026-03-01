import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp } from "../lib/api";
import { ApiError } from "../lib/api";
import ErrorModal from "../components/ErrorModal";

export default function SignUpPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const id = username.trim();
        const trimName = name.trim();
        if (!id || !password || !trimName) {
            setError("아이디, 비밀번호, 이름을 모두 입력하세요.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await signUp(id, password, trimName);
            navigate("/login");
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "회원가입에 실패했습니다.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: "0 auto", padding: 40 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 32, background: "#fff" }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, textAlign: "center" }}>회원가입</h1>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, textAlign: "center" }}>
                    일반 사용자 권한으로 가입합니다.
                </p>
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
                            autoComplete="new-password"
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
                        <span style={{ fontSize: 14, fontWeight: 500 }}>이름</span>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="이름"
                            autoComplete="name"
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
                        {loading ? "가입 중..." : "가입하기"}
                    </button>
                </form>
            </div>
            <p style={{ marginTop: 20, textAlign: "center", fontSize: 14 }}>
                <Link to="/login" style={{ color: "#2563eb", textDecoration: "underline" }}>
                    로그인으로 돌아가기
                </Link>
            </p>
            <ErrorModal open={!!error} message={error ?? ""} onClose={() => setError(null)} />
        </div>
    );
}
