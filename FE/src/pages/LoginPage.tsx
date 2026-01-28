import { useNavigate } from "react-router-dom";

export default function LoginPage() {
    const navigate = useNavigate();

    return (
        <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>로그인(임시)</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
                지금은 화면 골격부터. 나중에 AD 로그인 API 붙이자.
            </div>

            <button
                onClick={() => navigate("/posts?category=newbie")}
                style={{
                    marginTop: 14,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #2a2a2a",
                    background: "#1e1e1e",
                    color: "#eaeaea",
                    fontWeight: 800,
                }}
            >
                로그인(임시) 후 이동
            </button>
        </div>
    );
}
