import type { AssignmentRequestItem } from "../lib/api";
import { markAssignmentRequestRead } from "../lib/api";

type Props = {
    open: boolean;
    requests: AssignmentRequestItem[];
    onClose: () => void;
    onGoToAssignment?: (postId: number) => void;
};

function formatDate(iso: string) {
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
    } catch {
        return iso;
    }
}

export default function AssignmentRequestModal({ open, requests, onClose, onGoToAssignment }: Props) {
    if (!open) return null;

    const handleConfirm = async () => {
        for (const r of requests) {
            try {
                await markAssignmentRequestRead(r.id);
            } catch {
                // 개별 실패 시에도 계속
            }
        }
        onClose();
    };

    const handleGoTo = (postId: number) => {
        onGoToAssignment?.(postId);
        handleConfirm();
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignment-request-modal-title"
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
                    maxWidth: 440,
                    width: "100%",
                    maxHeight: "80vh",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2
                    id="assignment-request-modal-title"
                    style={{
                        fontSize: 18,
                        fontWeight: 700,
                        margin: 0,
                        padding: "20px 20px 12px",
                        color: "#111827",
                    }}
                >
                    실습 결과 작성 요청
                </h2>
                <p style={{ margin: 0, padding: "0 20px 16px", fontSize: 14, color: "#6b7280" }}>
                    관리자가 아래 실습에 대한 결과 작성을 요청했습니다.
                </p>
                <ul
                    style={{
                        margin: 0,
                        padding: "0 20px 16px",
                        listStyle: "none",
                        overflowY: "auto",
                        flex: 1,
                    }}
                >
                    {requests.map((r) => (
                        <li
                            key={r.id}
                            style={{
                                padding: "12px 12px",
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                marginBottom: 8,
                                background: "#f9fafb",
                            }}
                        >
                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{r.postTitle || "(제목 없음)"}</div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                                요청: {r.requestedByName ?? "관리자"} · {formatDate(r.createdAt)}
                            </div>
                            {onGoToAssignment && (
                                <button
                                    type="button"
                                    onClick={() => handleGoTo(r.postId)}
                                    style={{
                                        marginTop: 8,
                                        padding: "4px 10px",
                                        fontSize: 12,
                                        border: "1px solid #2563eb",
                                        borderRadius: 6,
                                        background: "#fff",
                                        color: "#2563eb",
                                        cursor: "pointer",
                                    }}
                                >
                                    실습으로 이동
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
                <div style={{ padding: "12px 20px 20px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "none",
                            background: "#2563eb",
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: "pointer",
                        }}
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
}
