import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { isAdmin } from "../lib/auth";
import {
    fetchMyTodoAssignmentRequests,
    fetchGradingTodo,
    type AssignmentRequestItem,
    type GradingNotificationItem,
} from "../lib/api";

export default function NotificationBell() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [todoRequests, setTodoRequests] = useState<AssignmentRequestItem[]>([]);
    const [gradingTodo, setGradingTodo] = useState<GradingNotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const admin = isAdmin();

    // 배지 개수용: 마운트 시 한 번 로드
    useEffect(() => {
        if (admin) {
            fetchGradingTodo().then(setGradingTodo).catch(() => setGradingTodo([]));
        } else {
            fetchMyTodoAssignmentRequests().then(setTodoRequests).catch(() => setTodoRequests([]));
        }
    }, [admin]);

    // 패널 열릴 때 목록 갱신
    useEffect(() => {
        if (!open) return;
        setLoading(true);
        if (admin) {
            fetchGradingTodo()
                .then(setGradingTodo)
                .catch(() => setGradingTodo([]))
                .finally(() => setLoading(false));
        } else {
            fetchMyTodoAssignmentRequests()
                .then(setTodoRequests)
                .catch(() => setTodoRequests([]))
                .finally(() => setLoading(false));
        }
    }, [open, admin]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) {
            document.addEventListener("click", handleClickOutside);
            return () => document.removeEventListener("click", handleClickOutside);
        }
    }, [open]);

    const todoCount = admin ? gradingTodo.length : todoRequests.length;
    const hasNotification = todoCount > 0;

    return (
        <div ref={panelRef} style={{ position: "relative" }}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                title="알림 목록"
                style={{
                    position: "relative",
                    padding: "6px 10px",
                    lineHeight: 1,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#374151",
                }}
                aria-label="알림"
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    focusable="false"
                    style={{ display: "block" }}
                >
                    <path
                        d="M12 22a2.4 2.4 0 0 0 2.4-2.4H9.6A2.4 2.4 0 0 0 12 22ZM20 18.4H4c1.6-1.6 2.4-3.2 2.4-6V9.2A5.6 5.6 0 0 1 11.2 3.8V3a.8.8 0 0 1 1.6 0v.8A5.6 5.6 0 0 1 17.6 9.2v3.2c0 2.8.8 4.4 2.4 6Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill={hasNotification ? "#facc15" : "none"}
                    />
                </svg>
                {todoCount > 0 && (
                    <span
                        style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            minWidth: 16,
                            height: 16,
                            borderRadius: 8,
                            background: "#dc2626",
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {todoCount > 99 ? "99+" : todoCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        marginTop: 8,
                        width: 320,
                        maxHeight: 360,
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                        overflow: "hidden",
                        zIndex: 1100,
                    }}
                >
                    <div
                        style={{
                            padding: "12px 16px",
                            borderBottom: "1px solid #e5e7eb",
                            fontWeight: 600,
                            fontSize: 14,
                            color: "#111827",
                        }}
                    >
                        알림 목록
                    </div>
                    <div style={{ maxHeight: 300, overflowY: "auto" }}>
                        {loading ? (
                            <div style={{ padding: 24, textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                                로딩 중...
                            </div>
                        ) : admin ? (
                            gradingTodo.length === 0 ? (
                                <div style={{ padding: 24, textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                                    알림이 없습니다.
                                </div>
                            ) : (
                                <ul style={{ margin: 0, padding: "8px 0", listStyle: "none" }}>
                                    {gradingTodo.map((g) => (
                                        <li key={g.postId}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigate(`/admin/assignment-grades?assignmentId=${g.postId}`);
                                                    setOpen(false);
                                                }}
                                                style={{
                                                    display: "block",
                                                    width: "100%",
                                                    padding: "10px 16px",
                                                    textAlign: "left",
                                                    border: "none",
                                                    background: "transparent",
                                                    cursor: "pointer",
                                                    fontSize: 14,
                                                    color: "#111827",
                                                }}
                                            >
                                                {g.postTitle || "(제목 없음)"}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )
                        ) : todoRequests.length === 0 ? (
                            <div style={{ padding: 24, textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                                알림이 없습니다.
                            </div>
                        ) : (
                            <ul style={{ margin: 0, padding: "8px 0", listStyle: "none" }}>
                                {todoRequests.map((r) => (
                                    <li key={r.id}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigate(`/posts/${r.postId}/assignment`);
                                                setOpen(false);
                                            }}
                                            style={{
                                                display: "block",
                                                width: "100%",
                                                padding: "10px 16px",
                                                textAlign: "left",
                                                border: "none",
                                                background: "transparent",
                                                cursor: "pointer",
                                                fontSize: 14,
                                                color: "#111827",
                                            }}
                                        >
                                            {r.postTitle || "(제목 없음)"}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
