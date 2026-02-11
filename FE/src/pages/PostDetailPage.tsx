import { useCallback, useEffect, useRef, useState } from "react";
import { Link, createSearchParams, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchPost, fetchCategories, incrementViewCount, deletePost, type PostDetail, type CategoryItem } from "../lib/api";
import { ApiError } from "../lib/api";
import { labelOfApiCategory } from "../lib/categories";
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

function getApiBase(): string {
    const env = (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE?.toString?.();
    if (env) return env;
    if (typeof window !== "undefined") return window.location.origin;
    return "http://localhost:8080";
}

export default function PostDetailPage() {
    const { id } = useParams();
    const [sp] = useSearchParams();
    const navigate = useNavigate();
    const catParam = sp.get("cat");
    const qParam = sp.get("q");

    const postId = Number(id);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [post, setPost] = useState<PostDetail | null>(null);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [deleting, setDeleting] = useState(false);
    const viewCountIncrementedRef = useRef<number | null>(null);

    useEffect(() => {
        fetchCategories()
            .then((list) => setCategories(list ?? []))
            .catch(() => setCategories([]));
    }, []);

    const listSearchParams = useCallback(() => {
        const p: Record<string, string> = {};
        if (catParam) p.cat = catParam;
        if (qParam) p.q = qParam;
        return p;
    }, [catParam, qParam]);

    const listUrl = `/posts?${createSearchParams(listSearchParams()).toString()}`;
    const editUrl = `/posts/${postId}/edit?${createSearchParams(listSearchParams()).toString()}`;

    const handleDelete = useCallback(async () => {
        if (!window.confirm("정말 이 게시글을 삭제하시겠습니까?\n삭제된 게시글은 목록에서 보이지 않지만 데이터베이스에는 유지되어 추후 복구할 수 있습니다.")) {
            return;
        }

        setDeleting(true);
        setError(null);
        try {
            await deletePost(postId);
            // 삭제 성공 시 목록으로 이동
            navigate(listUrl);
        } catch (e) {
            const msg =
                e instanceof ApiError
                    ? e.message
                    : e instanceof Error
                      ? e.message
                      : "삭제에 실패했습니다.";
            setError(msg);
        } finally {
            setDeleting(false);
        }
    }, [postId, listUrl, navigate]);

    useEffect(() => {
        let cancelled = false;
        let viewCountIncremented = false;
        
        // postId가 변경되면 이전 조회수 증가 추적 초기화
        if (viewCountIncrementedRef.current !== postId) {
            viewCountIncrementedRef.current = null;
        }

        async function run() {
            if (!Number.isFinite(postId)) {
                setError("잘못된 게시글 ID 입니다.");
                setPost(null);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // 게시글 데이터 가져오기
                const data = await fetchPost(postId);
                if (cancelled) return;
                
                setPost(data);
                
                // 조회수 증가: 목록에서 게시글 클릭으로 진입한 경우에만 (from=list)
                const fromList = sp.get("from") === "list";
                if (fromList && !viewCountIncremented && viewCountIncrementedRef.current !== postId) {
                    viewCountIncremented = true;
                    viewCountIncrementedRef.current = postId;
                    // 조회수 증가는 백그라운드에서 실행 (에러가 발생해도 UI에 영향 없음)
                    incrementViewCount(postId)
                        .then(() => {
                            // 성공 시 ref 유지
                        })
                        .catch((err) => {
                            console.warn("Failed to increment view count:", err);
                            // 실패 시 다시 시도할 수 있도록 초기화
                            if (viewCountIncrementedRef.current === postId) {
                                viewCountIncrementedRef.current = null;
                            }
                        });
                }
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
    }, [postId, sp]);

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
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{
                            width: 90,
                            minHeight: 42,
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid #dc2626",
                            color: "#fff",
                            background: deleting ? "#999" : "#dc2626",
                            fontWeight: 800,
                            boxSizing: "border-box",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: deleting ? "not-allowed" : "pointer",
                        }}
                    >
                        {deleting ? "삭제 중..." : "삭제"}
                    </button>
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
                            border: "1px solid var(--app-btn-secondary-border)",
                            textDecoration: "none",
                            color: "var(--app-btn-secondary-text)",
                            background: "var(--app-btn-secondary-bg)",
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
                    border: "1px solid var(--app-border)",
                    background: "var(--app-bg)",
                    color: "var(--app-text)",
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
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 900, fontSize: 18 }}>{post.title}</div>
                            </div>
                        </div>
                        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>
                                {post.categoryId 
                                    ? (categories.find(c => c.id === post.categoryId)?.label ?? "기타")
                                    : labelOfApiCategory(post.category)}
                            </div>
                            <div style={{ textAlign: "right", fontSize: 12, opacity: 0.8 }}>
                                생성 {formatKST(post.createdAt)}<br />
                                수정 {formatKST(post.updatedAt)}<br />
                                <div style={{ marginTop: 4 }}>
                                    조회 {post.viewCount ?? 0}
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                            id: {post.id}
                        </div>

                        {(() => {
                            try {
                                if (post.attachments && post.attachments !== "null" && post.attachments.trim() !== "" && post.attachments.trim() !== "[]") {
                                    type AttachItem = { url: string; name?: string };
                                    let items: AttachItem[] = [];
                                    try {
                                        const parsed = JSON.parse(post.attachments);
                                        if (Array.isArray(parsed)) {
                                            items = parsed.map((p: unknown) => {
                                                if (typeof p === "string") return { url: p };
                                                if (p && typeof p === "object" && "url" in p) {
                                                    const o = p as { url: string; name?: string };
                                                    return { url: o.url, name: o.name };
                                                }
                                                return null;
                                            }).filter(Boolean) as AttachItem[];
                                        }
                                    } catch {
                                        const trimmed = post.attachments.trim();
                                        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                                            const content = trimmed.slice(1, -1).trim();
                                            if (content) {
                                                items = content.split(",").map(s => {
                                                    const t = s.trim();
                                                    const url = t.startsWith("\"") && t.endsWith("\"") ? t.slice(1, -1) : t;
                                                    return { url };
                                                });
                                            }
                                        }
                                    }
                                    const valid = items.filter(x => x.url && x.url.trim() !== "");
                                    if (valid.length > 0) {
                                            return (
                                                <div style={{ marginTop: 16, padding: 12, background: "#f5f5f5", borderRadius: 8, border: "1px solid #ddd" }}>
                                                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>첨부파일 ({valid.length}개)</div>
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                        {valid.map((item: AttachItem, idx: number) => {
                                                            const cleanUrl = item.url.trim();
                                                            const fileName = item.name || cleanUrl.split("/").pop() || `첨부파일${idx + 1}`;
                                                            const fullUrl = cleanUrl.startsWith("http") ? cleanUrl : `${getApiBase()}${cleanUrl}`;
                                                            return (
                                                                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                    <span style={{ fontSize: 16 }}>📎</span>
                                                                    <a
                                                                        href={fullUrl}
                                                                        download={fileName}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{
                                                                            color: "var(--app-link)",
                                                                            textDecoration: "none",
                                                                            fontSize: 13,
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.textDecoration = "underline";
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.textDecoration = "none";
                                                                        }}
                                                                    >
                                                                        {fileName}
                                                                    </a>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }
                                    }
                            } catch (e) {
                                console.error("[PostDetail] Error parsing attachments:", e);
                            }
                            return null;
                        })()}

                        <div
                            className="markdown-preview"
                            data-color-mode="light"
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
