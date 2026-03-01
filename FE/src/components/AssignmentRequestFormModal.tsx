import { useEffect, useState } from "react";
import { fetchUsers, createAssignmentRequests, type UserItem } from "../lib/api";
import { ApiError } from "../lib/api";

type Props = {
    open: boolean;
    postId: number;
    postTitle: string;
    onClose: () => void;
    onSuccess?: () => void;
};

export default function AssignmentRequestFormModal({ open, postId, postTitle, onClose, onSuccess }: Props) {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setSelectedIds(new Set());
        setLoading(true);
        fetchUsers()
            .then((list) => setUsers(list ?? []))
            .catch(() => setUsers([]))
            .finally(() => setLoading(false));
    }, [open]);

    const toggle = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSubmit = async () => {
        if (selectedIds.size === 0) {
            setError("요청할 사용자를 한 명 이상 선택하세요.");
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await createAssignmentRequests(postId, Array.from(selectedIds));
            onSuccess?.();
            onClose();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "요청 전송에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 10000,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                boxSizing: "border-box",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: "#fff",
                    borderRadius: 12,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    maxWidth: 420,
                    width: "100%",
                    maxHeight: "85vh",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{ margin: 0, padding: "20px 20px 8px", fontSize: 18, fontWeight: 700 }}>
                    실습 결과 작성 요청
                </h2>
                <p style={{ margin: 0, padding: "0 20px 16px", fontSize: 14, color: "#6b7280" }}>
                    "{postTitle}" 실습에 대해 결과 작성을 요청할 사용자를 선택하세요.
                </p>
                {error && (
                    <div style={{ margin: "0 20px 12px", padding: 10, background: "#fef2f2", color: "#b91c1c", borderRadius: 8, fontSize: 13 }}>
                        {error}
                    </div>
                )}
                <div style={{ flex: 1, overflowY: "auto", padding: "0 20px", marginBottom: 16 }}>
                    {loading ? (
                        <p style={{ color: "#6b7280", fontSize: 14 }}>사용자 목록 불러오는 중...</p>
                    ) : users.length === 0 ? (
                        <p style={{ color: "#6b7280", fontSize: 14 }}>등록된 사용자가 없습니다.</p>
                    ) : (
                        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                            {users.map((u) => (
                                <li key={u.id} style={{ marginBottom: 6 }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(u.id)}
                                            onChange={() => toggle(u.id)}
                                        />
                                        <span>{u.name ?? u.username} ({u.username})</span>
                                        {u.role === "ADMIN" && <span style={{ fontSize: 11, color: "#6b7280" }}>관리자</span>}
                                    </label>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div style={{ padding: "12px 20px 20px", display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid #e5e7eb" }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            background: "#fff",
                            fontSize: 14,
                            cursor: "pointer",
                        }}
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || selectedIds.size === 0}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "none",
                            background: selectedIds.size > 0 && !submitting ? "#2563eb" : "#9ca3af",
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: submitting ? "not-allowed" : "pointer",
                        }}
                    >
                        {submitting ? "전송 중..." : `요청 보내기 (${selectedIds.size}명)`}
                    </button>
                </div>
            </div>
        </div>
    );
}
