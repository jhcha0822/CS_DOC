import { useEffect, useState, type ReactNode } from "react";

type DeletePostModalProps = {
    open: boolean;
    onClose: () => void;
    /** 삭제 사유(비어 있지 않은 문자열)로 호출 */
    onConfirm: (deletionReason: string) => Promise<void>;
    busy?: boolean;
    /** 기본: 게시글 삭제 */
    title?: string;
    /** 기본: 게시글 삭제 안내 문구 */
    description?: ReactNode;
};

/**
 * 게시글 소프트 삭제 확인. 삭제 사유 필수.
 */
const defaultDescription: ReactNode = (
    <>
        정말 이 게시글을 삭제하시겠습니까?
        <br />
        삭제된 게시글은 목록에서 보이지 않지만 데이터베이스에는 유지되어 추후 복구할 수 있습니다.
    </>
);

export default function DeletePostModal({
    open,
    onClose,
    onConfirm,
    busy,
    title = "게시글 삭제",
    description = defaultDescription,
}: DeletePostModalProps) {
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (open) setReason("");
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !busy) onClose();
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [open, busy, onClose]);

    if (!open) return null;

    const trimmed = reason.trim();
    const canSubmit = trimmed.length > 0 && !busy;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-post-modal-title"
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
            onClick={() => !busy && onClose()}
        >
            <div
                style={{
                    background: "#fff",
                    borderRadius: 12,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    maxWidth: 440,
                    width: "100%",
                    padding: 24,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2
                    id="delete-post-modal-title"
                    style={{
                        fontSize: 17,
                        fontWeight: 700,
                        marginBottom: 10,
                        color: "#111827",
                    }}
                >
                    {title}
                </h2>
                <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 14, lineHeight: 1.55 }}>{description}</p>
                <label htmlFor="delete-post-reason" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" }}>
                    삭제 사유 <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <textarea
                    id="delete-post-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="삭제 사유를 입력해야 삭제할 수 있습니다."
                    disabled={busy}
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        fontSize: 14,
                        resize: "vertical",
                        marginBottom: 8,
                        fontFamily: "inherit",
                    }}
                />
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16, textAlign: "right" }}>
                    {trimmed.length} / 2000
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            background: "#fff",
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: busy ? "not-allowed" : "pointer",
                            opacity: busy ? 0.7 : 1,
                        }}
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        disabled={!canSubmit}
                        onClick={async () => {
                            if (!canSubmit) return;
                            await onConfirm(trimmed);
                        }}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "none",
                            background: canSubmit ? "#dc2626" : "#fca5a5",
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: canSubmit ? "pointer" : "not-allowed",
                        }}
                    >
                        {busy ? "삭제 중…" : "삭제"}
                    </button>
                </div>
            </div>
        </div>
    );
}
