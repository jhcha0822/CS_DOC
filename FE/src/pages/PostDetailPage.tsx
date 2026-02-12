import { useCallback, useEffect, useRef, useState } from "react";
import { Link, createSearchParams, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchPost, fetchCategories, incrementViewCount, deletePost, getComments, createComment, updateComment, deleteComment, type PostDetail, type CategoryItem, type Comment } from "../lib/api";
import { ApiError } from "../lib/api";
import { labelOfApiCategory } from "../lib/categories";
import { getCurrentUser } from "../lib/auth";
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
    
    // 댓글 관련 상태
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentLoading, setCommentLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editingCommentContent, setEditingCommentContent] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);

    useEffect(() => {
        fetchCategories()
            .then((list) => setCategories(list ?? []))
            .catch(() => setCategories([]));
    }, []);

    // 댓글 로드
    const loadComments = useCallback(async () => {
        if (!Number.isFinite(postId)) return;
        setCommentLoading(true);
        try {
            const commentList = await getComments(postId);
            setComments(commentList);
        } catch (e) {
            console.error("Failed to load comments:", e);
        } finally {
            setCommentLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    // 댓글 작성
    const handleCreateComment = useCallback(async () => {
        if (!newComment.trim()) return;
        const currentUser = getCurrentUser();
        setSubmittingComment(true);
        try {
            await createComment(postId, newComment, currentUser?.id);
            setNewComment("");
            await loadComments();
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "댓글 작성에 실패했습니다.";
            alert(msg);
        } finally {
            setSubmittingComment(false);
        }
    }, [postId, newComment, loadComments]);

    // 댓글 수정 시작
    const handleStartEditComment = useCallback((comment: Comment) => {
        setEditingCommentId(comment.id);
        setEditingCommentContent(comment.content);
    }, []);

    // 댓글 수정 취소
    const handleCancelEditComment = useCallback(() => {
        setEditingCommentId(null);
        setEditingCommentContent("");
    }, []);

    // 댓글 수정 저장
    const handleUpdateComment = useCallback(async (id: number) => {
        if (!editingCommentContent.trim()) return;
        const currentUser = getCurrentUser();
        setSubmittingComment(true);
        try {
            await updateComment(id, editingCommentContent, currentUser?.id);
            setEditingCommentId(null);
            setEditingCommentContent("");
            await loadComments();
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "댓글 수정에 실패했습니다.";
            alert(msg);
        } finally {
            setSubmittingComment(false);
        }
    }, [editingCommentContent, loadComments]);

    // 댓글 삭제
    const handleDeleteComment = useCallback(async (id: number) => {
        if (!window.confirm("정말 이 댓글을 삭제하시겠습니까?")) return;
        setSubmittingComment(true);
        try {
            await deleteComment(id);
            await loadComments();
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "댓글 삭제에 실패했습니다.";
            alert(msg);
        } finally {
            setSubmittingComment(false);
        }
    }, [loadComments]);

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
                                수정 {formatKST(post.updatedAt)}
                                {post.updatedByName && <span style={{ marginLeft: 6 }}>· {post.updatedByName}</span>}
                                <br />
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

                {/* 댓글 섹션 */}
                <div style={{ marginTop: 40, paddingTop: 24, borderTop: "2px solid #e5e7eb" }}>
                    <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: 20, fontWeight: 700 }}>댓글 ({comments.length})</h3>
                    
                    {/* 댓글 작성 폼 */}
                    <div style={{ marginBottom: 24 }}>
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="댓글을 입력하세요..."
                            rows={4}
                            style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: 8,
                                border: "1px solid #444",
                                fontSize: 14,
                                fontFamily: "inherit",
                                resize: "vertical",
                            }}
                        />
                        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button
                                type="button"
                                onClick={handleCreateComment}
                                disabled={submittingComment || !newComment.trim()}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 8,
                                    border: "1px solid #444",
                                    background: submittingComment || !newComment.trim() ? "#999" : "#2563eb",
                                    color: "#fff",
                                    fontWeight: 600,
                                    cursor: submittingComment || !newComment.trim() ? "not-allowed" : "pointer",
                                    fontSize: 14,
                                }}
                            >
                                등록
                            </button>
                        </div>
                    </div>

                    {/* 댓글 목록 */}
                    {commentLoading ? (
                        <div style={{ padding: 20, textAlign: "center", opacity: 0.7 }}>댓글을 불러오는 중...</div>
                    ) : comments.length === 0 ? (
                        <div style={{ padding: 20, textAlign: "center", opacity: 0.7 }}>댓글이 없습니다.</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {comments.map((comment) => (
                                <div
                                    key={comment.id}
                                    style={{
                                        padding: 16,
                                        borderRadius: 8,
                                        border: "1px solid #e5e7eb",
                                        background: "#f9fafb",
                                    }}
                                >
                                    {editingCommentId === comment.id ? (
                                        <div>
                                            <textarea
                                                value={editingCommentContent}
                                                onChange={(e) => setEditingCommentContent(e.target.value)}
                                                rows={3}
                                                style={{
                                                    width: "100%",
                                                    padding: "8px",
                                                    borderRadius: 6,
                                                    border: "1px solid #444",
                                                    fontSize: 14,
                                                    fontFamily: "inherit",
                                                    resize: "vertical",
                                                }}
                                            />
                                            <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                                <button
                                                    type="button"
                                                    onClick={handleCancelEditComment}
                                                    disabled={submittingComment}
                                                    style={{
                                                        padding: "6px 12px",
                                                        borderRadius: 6,
                                                        border: "1px solid #444",
                                                        background: "#fff",
                                                        color: "#111",
                                                        fontWeight: 600,
                                                        cursor: submittingComment ? "not-allowed" : "pointer",
                                                        fontSize: 13,
                                                    }}
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateComment(comment.id)}
                                                    disabled={submittingComment || !editingCommentContent.trim()}
                                                    style={{
                                                        padding: "6px 12px",
                                                        borderRadius: 6,
                                                        border: "1px solid #444",
                                                        background: submittingComment || !editingCommentContent.trim() ? "#999" : "#2563eb",
                                                        color: "#fff",
                                                        fontWeight: 600,
                                                        cursor: submittingComment || !editingCommentContent.trim() ? "not-allowed" : "pointer",
                                                        fontSize: 13,
                                                    }}
                                                >
                                                    저장
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{ marginBottom: 8 }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                                                    {comment.createdByName || comment.updatedByName || "익명"}
                                                </div>
                                                <div style={{ fontSize: 12, opacity: 0.7 }}>
                                                    {formatKST(comment.createdAt)}
                                                    {comment.updatedAt !== comment.createdAt && (
                                                        <span style={{ marginLeft: 8 }}>(수정됨)</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                                {comment.content}
                                            </div>
                                            {(() => {
                                                const currentUser = getCurrentUser();
                                                const isCommentAuthor = currentUser && comment.createdBy && currentUser.id === comment.createdBy;
                                                const isAdmin = currentUser?.role === "ADMIN";
                                                const canEdit = isCommentAuthor;
                                                const canDelete = isCommentAuthor || isAdmin;
                                                
                                                if (!canEdit && !canDelete) return null;
                                                
                                                return (
                                                    <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                                        {canEdit && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStartEditComment(comment)}
                                                                disabled={submittingComment}
                                                                style={{
                                                                    padding: "4px 8px",
                                                                    borderRadius: 4,
                                                                    border: "1px solid #444",
                                                                    background: "#fff",
                                                                    color: "#111",
                                                                    fontWeight: 500,
                                                                    cursor: submittingComment ? "not-allowed" : "pointer",
                                                                    fontSize: 12,
                                                                }}
                                                            >
                                                                수정
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteComment(comment.id)}
                                                                disabled={submittingComment}
                                                                style={{
                                                                    padding: "4px 8px",
                                                                    borderRadius: 4,
                                                                    border: "1px solid #dc2626",
                                                                    background: "#dc2626",
                                                                    color: "#fff",
                                                                    fontWeight: 500,
                                                                    cursor: submittingComment ? "not-allowed" : "pointer",
                                                                    fontSize: 12,
                                                                }}
                                                            >
                                                                삭제
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
