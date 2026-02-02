import { useCallback, useEffect, useState } from "react";
import { Link, createSearchParams, useParams, useSearchParams } from "react-router-dom";
import { fetchPost, type PostDetail } from "../lib/api";
import { ApiError } from "../lib/api";
import { labelOfApiCategory } from "../lib/categories";
import { useColorScheme } from "../lib/useColorScheme";
import MarkdownPreview from "@uiw/react-markdown-preview";
import "@uiw/react-markdown-preview/markdown.css";

function formatKST(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
}

export default function PostDetailPage() {
    const { id } = useParams();
    const [sp] = useSearchParams();
    const catParam = sp.get("cat");
    const qParam = sp.get("q");
    const colorScheme = useColorScheme();

    const postId = Number(id);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [post, setPost] = useState<PostDetail | null>(null);

    const listSearchParams = useCallback(() => {
        const p: Record<string, string> = {};
        if (catParam) p.cat = catParam;
        if (qParam) p.q = qParam;
        return p;
    }, [catParam, qParam]);

    const listUrl = `/posts?${createSearchParams(listSearchParams()).toString()}`;
    const editUrl = `/posts/${postId}/edit?${createSearchParams(listSearchParams()).toString()}`;

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!Number.isFinite(postId)) {
                setError("잘못된 게시글 ID 입니다.");
                setPost(null);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const data = await fetchPost(postId);
                if (cancelled) return;
                setPost(data);
            } catch (e) {
                if (cancelled) return;
                const msg =
                    e instanceof ApiError
                        ? e.message
                        : e instanceof Error
                          ? e.message
                          : "게시글을 불러오지 못했습니다.";
                setError(msg);
                setPost(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [postId]);

    const bodyText = post?.contentMd ?? "";

    return (
        <div style={{ maxWidth: "100%", minWidth: 0 }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                }}
            >
                <div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>게시글 상세</div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                        id=<b>{id}</b>
                    </div>
                </div>

                <div className="header-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch" }}>
                    <Link
                        to={editUrl}
                        style={{
                            width: 90,
                            minHeight: 42,
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid #444",
                            textDecoration: "none",
                            color: "#fff",
                            background: "#2563eb",
                            fontWeight: 800,
                            boxSizing: "border-box",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        수정
                    </Link>
                    <Link
                        to={listUrl}
                        style={{
                            width: 90,
                            minHeight: 42,
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid #444",
                            textDecoration: "none",
                            color: "#111",
                            background: "#fff",
                            fontWeight: 800,
                            boxSizing: "border-box",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        목록
                    </Link>
                </div>
            </div>

            <div
                className="content-card"
                style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 12,
                    border: "1px solid #444",
                    background: "#fff",
                    minHeight: 120,
                }}
            >
                {loading && <div style={{ opacity: 0.8 }}>불러오는 중...</div>}

                {error && (
                    <div>
                        <div style={{ color: "var(--app-error)", fontWeight: 800 }}>{error}</div>
                        <div style={{ marginTop: 10, opacity: 0.8 }}>
                            <Link to={listUrl} style={{ color: "var(--app-link)" }}>
                                목록으로 돌아가기 →
                            </Link>
                        </div>
                    </div>
                )}

                {!loading && !error && post && (
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 18 }}>{post.title}</div>
                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                            {labelOfApiCategory(post.category)} · 생성{" "}
                            {formatKST(post.createdAt)} · 수정{" "}
                            {formatKST(post.updatedAt)}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                            id: {post.id}
                        </div>

                        <div
                            className="markdown-preview"
                            data-color-mode={colorScheme}
                            style={{
                                marginTop: 16,
                                padding: bodyText ? 16 : 0,
                                background: bodyText ? "var(--app-bg)" : "transparent",
                                borderRadius: 8,
                                overflow: "auto",
                                minHeight: bodyText ? 80 : 0,
                                maxWidth: "100%",
                            }}
                        >
                            {bodyText ? (
                                <MarkdownPreview source={bodyText} />
                            ) : (
                                <span style={{ opacity: 0.6 }}>본문이 없습니다.</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
