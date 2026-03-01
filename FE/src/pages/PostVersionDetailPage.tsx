import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPostVersion, ApiError, type PostVersion } from "../lib/api";
import MarkdownPreview from "@uiw/react-markdown-preview";
import "@uiw/react-markdown-preview/markdown.css";
import { markdownPreviewImageComponents } from "../components/MarkdownImageWithModal";
import ErrorModal from "../components/ErrorModal";

function formatKST(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
}

export default function PostVersionDetailPage() {
    const { postId, versionNumber } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [version, setVersion] = useState<PostVersion | null>(null);

    const pid = Number(postId);
    const vnum = Number(versionNumber);

    useEffect(() => {
        if (!Number.isFinite(pid) || !Number.isFinite(vnum)) {
            setError("잘못된 경로입니다.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        getPostVersion(pid, vnum)
            .then((v) => setVersion(v))
            .catch((e) => {
                setError(
                    e instanceof ApiError
                        ? e.message
                        : e instanceof Error
                          ? e.message
                          : "버전을 불러오지 못했습니다."
                );
            })
            .finally(() => setLoading(false));
    }, [pid, vnum]);

    if (loading) {
        return (
            <div style={{ padding: 24 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>불러오는 중...</div>
            </div>
        );
    }

    if (error || !version) {
        return (
            <div style={{ padding: 24 }}>
                <Link to="/posts/versions" style={{ color: "var(--app-link)", textDecoration: "underline" }}>
                    ← 이력 목록으로 돌아가기
                </Link>
                <ErrorModal open={!!error} message={error ?? "버전을 찾을 수 없습니다."} onClose={() => setError(null)} />
            </div>
        );
    }

    return (
        <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>
                        버전 {version.versionNumber} · {version.title || "(제목 없음)"}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                        수정일: {formatKST(version.createdAt)}
                        {version.createdByName && <span style={{ marginLeft: 6 }}>· {version.createdByName}</span>}
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <Link
                        to={`/posts/${pid}`}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "1px solid #444",
                            background: "#fff",
                            color: "#111",
                            textDecoration: "none",
                            fontWeight: 700,
                        }}
                    >
                        게시글 보기
                    </Link>
                    <Link
                        to="/posts/versions"
                        style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "1px solid #444",
                            background: "#eee",
                            color: "#111",
                            textDecoration: "none",
                            fontWeight: 700,
                        }}
                    >
                        이력 목록
                    </Link>
                </div>
            </div>
            <div
                className="markdown-preview"
                data-color-mode="light"
                style={{
                    padding: 24,
                    background: "var(--app-bg)",
                    borderRadius: 12,
                    border: "1px solid var(--app-border)",
                    minHeight: 200,
                }}
            >
                <MarkdownPreview source={version.contentMd || ""} components={markdownPreviewImageComponents} />
            </div>
        </div>
    );
}
