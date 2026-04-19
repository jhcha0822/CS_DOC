import { useState, useCallback } from "react";
import { getApiBase } from "../lib/api";

/** react-markdown의 img 컴포넌트에 넘어오는 props (node 제외하고 나머지는 img 표준) */
type MarkdownImgProps = React.ImgHTMLAttributes<HTMLImageElement> & { node?: unknown };

/** /uploads/ 상대 경로는 BE에서 서빙하므로 API 기준 URL로 변환 (Ctrl+V 첨부 이미지 등) */
function resolveImageSrc(src: string | undefined): string {
    if (!src) return "";
    if (src.startsWith("http")) return src;
    if (src.startsWith("/uploads/")) return getApiBase().replace(/\/$/, "") + src;
    return (typeof window !== "undefined" ? window.location.origin : "") + (src.startsWith("/") ? "" : "/") + src;
}

/**
 * 마크다운 본문 내 이미지: 기본은 제한된 크기로 표시되고, 클릭 시 원본 크기 모달로 확대.
 * MarkdownPreview의 components={{ img: MarkdownImageWithModal }} 로 사용.
 */
export function MarkdownImageWithModal(props: MarkdownImgProps) {
    const { node: _node, src, alt, style, ...rest } = props;
    const [modalOpen, setModalOpen] = useState(false);
    const resolvedSrc = resolveImageSrc(src);

    const handleClick = useCallback(() => {
        if (resolvedSrc) setModalOpen(true);
    }, [resolvedSrc]);

    const closeModal = useCallback(() => setModalOpen(false), []);

    return (
        <>
            <img
                {...rest}
                src={resolvedSrc}
                alt={alt ?? ""}
                role="button"
                tabIndex={0}
                style={{
                    ...style,
                    cursor: "pointer",
                    maxHeight: "500px",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                }}
                onClick={handleClick}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleClick();
                    }
                }}
            />
            {modalOpen && resolvedSrc && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="이미지 확대"
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9999,
                        background: "rgba(0,0,0,0.85)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                        boxSizing: "border-box",
                    }}
                    onClick={closeModal}
                >
                    <button
                        type="button"
                        aria-label="닫기"
                        onClick={closeModal}
                        style={{
                            position: "absolute",
                            top: 16,
                            right: 16,
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            border: "none",
                            background: "rgba(255,255,255,0.2)",
                            color: "#fff",
                            fontSize: 24,
                            lineHeight: 1,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        ×
                    </button>
                    <img
                        src={resolvedSrc}
                        alt={alt ?? "확대 보기"}
                        style={{
                            maxWidth: "95vw",
                            maxHeight: "90vh",
                            width: "auto",
                            height: "auto",
                            objectFit: "contain",
                            borderRadius: 4,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}

/** @uiw/react-markdown-preview 의 components prop에 그대로 넣을 객체 */
export const markdownPreviewImageComponents = {
    img: MarkdownImageWithModal,
};
