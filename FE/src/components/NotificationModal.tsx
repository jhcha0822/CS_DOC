import type {
    AssignmentRequestItem,
    GradingNotificationItem,
    GradedNotificationItem,
} from "../lib/api";
import {
    markAssignmentRequestRead,
    markAllGradingRead,
    markGradedNotificationRead,
} from "../lib/api";

type Props = {
    open: boolean;
    assignmentRequests: AssignmentRequestItem[];
    gradingItems: GradingNotificationItem[];
    gradedItems: GradedNotificationItem[];
    isAdmin: boolean;
    onClose: () => void;
    onGoToAssignment?: (postId: number) => void;
    onGoToGrading?: (postId: number) => void;
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

export default function NotificationModal({
    open,
    assignmentRequests,
    gradingItems,
    gradedItems,
    isAdmin,
    onClose,
    onGoToAssignment,
    onGoToGrading,
}: Props) {
    if (!open) return null;

    const hasAny =
        assignmentRequests.length > 0 || gradingItems.length > 0 || gradedItems.length > 0;
    if (!hasAny) return null;

    const handleConfirm = async () => {
        for (const r of assignmentRequests) {
            try {
                await markAssignmentRequestRead(r.id);
            } catch {
                /* no-op */
            }
        }
        if (isAdmin && gradingItems.length > 0) {
            try {
                await markAllGradingRead();
            } catch {
                /* no-op */
            }
        }
        for (const g of gradedItems) {
            try {
                await markGradedNotificationRead(g.id);
            } catch {
                /* no-op */
            }
        }
        onClose();
    };

    const handleGoToAssignment = (postId: number) => {
        onGoToAssignment?.(postId);
        handleConfirm();
    };

    const handleGoToGrading = (postId: number) => {
        onGoToGrading?.(postId);
        handleConfirm();
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-modal-title"
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
                    id="notification-modal-title"
                    style={{
                        fontSize: 18,
                        fontWeight: 700,
                        margin: 0,
                        padding: "20px 20px 12px",
                        color: "#111827",
                    }}
                >
                    알림
                </h2>

                <div style={{ padding: "0 20px 16px", overflowY: "auto", flex: 1 }}>
                    {assignmentRequests.length > 0 && (
                        <section style={{ marginBottom: 16 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                                작성해야 할 실습
                            </h3>
                            <p style={{ margin: 0, fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                                관리자가 아래 실습에 대한 결과 작성을 요청했습니다.
                            </p>
                            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                                {assignmentRequests.map((r) => (
                                    <li
                                        key={r.id}
                                        style={{
                                            padding: 12,
                                            border: "1px solid #e5e7eb",
                                            borderRadius: 8,
                                            marginBottom: 8,
                                            background: "#f9fafb",
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                                            {r.postTitle || "(제목 없음)"}
                                        </div>
                                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                                            요청: {r.requestedByName ?? "관리자"} · {formatDate(r.createdAt)}
                                        </div>
                                        {onGoToAssignment && (
                                            <button
                                                type="button"
                                                onClick={() => handleGoToAssignment(r.postId)}
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
                        </section>
                    )}

                    {isAdmin && gradingItems.length > 0 && (
                        <section style={{ marginBottom: 16 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                                평가가 필요한 과제
                            </h3>
                            <p style={{ margin: 0, fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                                제출된 실습이 있어 평가가 필요합니다.
                            </p>
                            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                                {gradingItems.map((g) => (
                                    <li
                                        key={g.postId}
                                        style={{
                                            padding: 12,
                                            border: "1px solid #e5e7eb",
                                            borderRadius: 8,
                                            marginBottom: 8,
                                            background: "#f9fafb",
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                                            {g.postTitle || "(제목 없음)"}
                                        </div>
                                        {onGoToGrading && (
                                            <button
                                                type="button"
                                                onClick={() => handleGoToGrading(g.postId)}
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
                                                채점하러 가기
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {gradedItems.length > 0 && (
                        <section style={{ marginBottom: 16 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                                평가가 완료된 실습 제출물
                            </h3>
                            <p style={{ margin: 0, fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                                평가가 완료된 실습 제출물이 있습니다.
                            </p>
                            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                                {gradedItems.map((g) => (
                                    <li
                                        key={g.id}
                                        style={{
                                            padding: 12,
                                            border: "1px solid #e5e7eb",
                                            borderRadius: 8,
                                            marginBottom: 8,
                                            background: "#f9fafb",
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                                            {g.postTitle || "(제목 없음)"}
                                        </div>
                                        {onGoToAssignment && (
                                            <button
                                                type="button"
                                                onClick={() => handleGoToAssignment(g.postId)}
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
                                                실습 보기
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>

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
