import { useEffect } from "react";

type ErrorModalProps = {
    open: boolean;
    message: string;
    onClose: () => void;
};

/**
 * 에러 메시지를 모달 팝업으로 표시. 페이지 내 인라인 대신 사용.
 */
export default function ErrorModal({ open, message, onClose }: ErrorModalProps) {
    useEffect(() => {
        if (!open) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="error-modal-title"
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
                    maxWidth: 400,
                    width: "100%",
                    padding: 24,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2
                    id="error-modal-title"
                    style={{
                        fontSize: 16,
                        fontWeight: 600,
                        marginBottom: 12,
                        color: "#b91c1c",
                    }}
                >
                    오류
                </h2>
                <p
                    style={{
                        fontSize: 14,
                        color: "#374151",
                        marginBottom: 20,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                    }}
                >
                    {message || "오류가 발생했습니다."}
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            background: "#fff",
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: "pointer",
                        }}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
