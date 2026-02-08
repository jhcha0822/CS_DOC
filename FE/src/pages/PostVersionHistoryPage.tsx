import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getDeletionHistory, getPostVersions, listDeletedPosts, getAllChangeHistory, getPostVersion, getChangeHistoryForPost, type PostListItem, type PostVersion, type ChangeHistoryItem, ApiError } from "../lib/api";
import MarkdownPreview from "@uiw/react-markdown-preview";
import "@uiw/react-markdown-preview/markdown.css";
import { fetchCategories, type CategoryItem } from "../lib/api";
import { labelOfApiCategory } from "../lib/categories";

const PAGE_SIZE_OPTIONS = [10, 15, 20] as const;

function formatKST(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
}

/** 첨부파일 JSON에서 표시용 파일명 목록 추출. 원본 파일명(name) 우선, 없으면 URL에서 추출 */
function parseAttachmentDisplayNames(attachments: string | null): string[] {
    if (!attachments || attachments === "null" || attachments.trim() === "" || attachments.trim() === "[]") return [];
    try {
        const parsed = JSON.parse(attachments);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((p: unknown) => {
            if (typeof p === "string") return p.split("/").pop() || "";
            if (p && typeof p === "object" && "url" in p) {
                const o = p as { url: string; name?: string };
                return o.name || o.url.split("/").pop() || "";
            }
            return "";
        }).filter(Boolean);
    } catch {
        return [];
    }
}

export default function PostVersionHistoryPage() {
    const [viewMode, setViewMode] = useState<"list" | "table">("table"); // "list" 또는 "table"
    const [searchKeyword, setSearchKeyword] = useState("");
    const [searchPostId, setSearchPostId] = useState("");
    const [searchType, setSearchType] = useState<"제목" | "ID">("제목");
    const [changeTypeFilter, setChangeTypeFilter] = useState<"전체" | "생성" | "수정" | "삭제">("전체");
    const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<PostVersion | null>(null);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<ChangeHistoryItem | null>(null);
    const [deletedPosts, setDeletedPosts] = useState<PostListItem[]>([]);
    const [changeHistory, setChangeHistory] = useState<ChangeHistoryItem[]>([]);
    const [versions, setVersions] = useState<PostVersion[]>([]);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDeletedHistory, setShowDeletedHistory] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [historyPage, setHistoryPage] = useState(0);
    const [postHistoryModalOpen, setPostHistoryModalOpen] = useState(false);
    const [postHistory, setPostHistory] = useState<ChangeHistoryItem[]>([]);
    const [selectedPostIdForModal, setSelectedPostIdForModal] = useState<number | null>(null);
    const [pageSize, setPageSize] = useState(10);
    const loadReqIdRef = useRef(0);

    const loadDeletedPosts = useCallback(async () => {
        const reqId = ++loadReqIdRef.current;
        setLoading(true);
        setError(null);
        try {
            const postIdNum = searchPostId.trim() ? Number(searchPostId.trim()) : undefined;
            const result = await listDeletedPosts(
                searchKeyword.trim() || undefined,
                postIdNum,
                page,
                pageSize
            );
            if (reqId !== loadReqIdRef.current) return;
            setDeletedPosts(result.items || []);
            setTotalPages(result.totalPages || 0);
        } catch (e) {
            const msg =
                e instanceof ApiError
                    ? e.message
                    : e instanceof Error
                      ? e.message
                      : "삭제된 게시글을 불러오지 못했습니다.";
            setError(msg);
            setDeletedPosts([]);
        } finally {
            setLoading(false);
        }
    }, [searchKeyword, searchPostId, page, pageSize]);

    const loadDeletionHistory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const history = await getDeletionHistory();
            setDeletedPosts(history);
        } catch (e) {
            const msg =
                e instanceof ApiError
                    ? e.message
                    : e instanceof Error
                      ? e.message
                      : "삭제 이력을 불러오지 못했습니다.";
            setError(msg);
            setDeletedPosts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadVersions = useCallback(async (postId: number) => {
        setLoading(true);
        setError(null);
        try {
            const vers = await getPostVersions(postId);
            setVersions(vers);
            setSelectedVersion(null); // 초기화
        } catch (e) {
            const msg =
                e instanceof ApiError
                    ? e.message
                    : e instanceof Error
                      ? e.message
                      : "버전 이력을 불러오지 못했습니다.";
            setError(msg);
            setVersions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadChangeHistory = useCallback(async () => {
        const reqId = ++loadReqIdRef.current;
        setLoading(true);
        setError(null);
        try {
            const filter = changeTypeFilter === "전체" ? undefined : changeTypeFilter;
            const kw = searchType === "제목" ? (searchKeyword.trim() || undefined) : undefined;
            const pid = searchType === "ID" && searchKeyword.trim() ? Number(searchKeyword.trim()) : undefined;
            const result = await getAllChangeHistory(filter, historyPage, pageSize, kw, pid);
            if (reqId !== loadReqIdRef.current) return;
            setChangeHistory(result.items || []);
            setTotalPages(result.totalPages ?? 0);
        } catch (e) {
            const msg =
                e instanceof ApiError
                    ? e.message
                    : e instanceof Error
                      ? e.message
                      : "변경 이력을 불러오지 못했습니다.";
            setError(msg);
            setChangeHistory([]);
        } finally {
            setLoading(false);
        }
    }, [changeTypeFilter, searchKeyword, searchType, historyPage, pageSize]);

    useEffect(() => {
        fetchCategories()
            .then((list) => setCategories(list ?? []))
            .catch(() => setCategories([]));
    }, []);

    useEffect(() => {
        if (viewMode === "table") {
            loadChangeHistory();
        } else {
            if (showDeletedHistory) {
                loadDeletionHistory();
            } else {
                loadDeletedPosts();
            }
        }
    }, [viewMode, showDeletedHistory, loadDeletedPosts, loadDeletionHistory, loadChangeHistory]);

    useEffect(() => {
        setHistoryPage(0);
    }, [changeTypeFilter, searchKeyword, searchType]);

    useEffect(() => {
        setHistoryPage(0);
        setPage(0);
    }, [pageSize]);

    const handleSearch = () => {
        setPage(0);
        if (viewMode === "table") {
            setHistoryPage(0);
        } else {
            if (showDeletedHistory) {
                loadDeletionHistory();
            } else {
                loadDeletedPosts();
            }
        }
    };

    const handlePostClick = (postId: number) => {
        setSelectedPostId(postId);
        loadVersions(postId);
    };

    const handleVersionClick = (version: PostVersion) => {
        setSelectedVersion(version);
    };

    const handleHistoryItemClick = async (item: ChangeHistoryItem) => {
        setSelectedPostIdForModal(item.postId);
        setPostHistoryModalOpen(true);
        setLoading(true);
        setError(null);
        try {
            const history = await getChangeHistoryForPost(item.postId);
            setPostHistory(history);
            setSelectedHistoryItem(null);
            setSelectedVersion(null);
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "변경 이력을 불러오지 못했습니다.";
            setError(msg);
            setPostHistory([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePostHistoryRowClick = async (item: ChangeHistoryItem) => {
        setSelectedHistoryItem(item);
        if (item.changeType === "삭제" || item.versionNumber === null) {
            setSelectedVersion(null);
            return;
        }
        try {
            const version = await getPostVersion(item.postId, item.versionNumber);
            setSelectedVersion(version);
        } catch (e) {
            console.error("Failed to load version:", e);
            setSelectedVersion(null);
        }
    };

    return (
        <div style={{ maxWidth: "100%", minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>이력</div>

            {/* 검색 영역 */}
            <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as "제목" | "ID")}
                    style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #444",
                        background: "#fff",
                    }}
                >
                    <option value="제목">제목</option>
                    <option value="ID">ID</option>
                </select>
                <input
                    type="text"
                    placeholder={searchType === "제목" ? "검색어를 입력하세요." : "게시글 ID를 입력하세요."}
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearch();
                    }}
                    style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #444",
                        minWidth: 200,
                    }}
                />
                <select
                    value={changeTypeFilter}
                    onChange={(e) => setChangeTypeFilter(e.target.value as "전체" | "생성" | "수정" | "삭제")}
                    style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #444",
                        background: "#fff",
                    }}
                >
                    <option value="전체">전체</option>
                    <option value="생성">생성</option>
                    <option value="수정">수정</option>
                    <option value="삭제">삭제</option>
                </select>
                <button
                    onClick={handleSearch}
                    style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        border: "1px solid #444",
                        background: "#2563eb",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: "pointer",
                    }}
                >
                    검색
                </button>
                <button
                    onClick={() => {
                        setSearchKeyword("");
                        setSearchPostId("");
                        setChangeTypeFilter("전체");
                        setPage(0);
                        if (viewMode === "table") setHistoryPage(0);
                    }}
                    style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        border: "1px solid #444",
                        background: "#fff",
                        fontWeight: 700,
                        cursor: "pointer",
                    }}
                >
                    초기화
                </button>
                <button
                    onClick={() => {
                        setViewMode(viewMode === "table" ? "list" : "table");
                        setSelectedPostId(null);
                        setVersions([]);
                        setSelectedVersion(null);
                        setSelectedHistoryItem(null);
                    }}
                    style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        border: "1px solid #444",
                        background: viewMode === "table" ? "#10b981" : "#fff",
                        color: viewMode === "table" ? "#fff" : "#111",
                        fontWeight: 700,
                        cursor: "pointer",
                    }}
                >
                    {viewMode === "table" ? "테이블 보기" : "목록 보기"}
                </button>
            </div>

            {error && (
                <div style={{ marginBottom: 16, color: "var(--app-error)", fontWeight: 700 }}>
                    {error}
                </div>
            )}

            {viewMode === "table" ? (
                /* 테이블 뷰 */
                <div style={{ border: "1px solid var(--app-border)", borderRadius: 12, padding: 16, background: "var(--app-bg)" }}>
                    {loading && <div style={{ opacity: 0.8, padding: 20 }}>불러오는 중...</div>}
                    {!loading && changeHistory.length === 0 && (
                        <div style={{ opacity: 0.6, padding: 20 }}>변경 이력이 없습니다.</div>
                    )}
                    {!loading && changeHistory.length > 0 && (
                        <>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid #ddd", background: "#f5f5f5" }}>
                                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 700 }}>글 ID</th>
                                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 700 }}>카테고리</th>
                                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 700 }}>구분</th>
                                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 700 }}>제목</th>
                                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 700 }}>수정일</th>
                                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 700 }}>사용자</th>
                                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 700 }}>버전</th>
                                        <th style={{ padding: "12px", textAlign: "left", fontWeight: 700 }}>첨부</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {changeHistory.map((item, idx) => {
                                        const categoryLabel = item.categoryId
                                            ? (categories.find(c => c.id === item.categoryId)?.label ?? "기타")
                                            : labelOfApiCategory(item.category);
                                        const attachNames = parseAttachmentDisplayNames(item.attachments);
                                        const hasAttachments = attachNames.length > 0;
                                        
                                        return (
                                            <tr
                                                key={`${item.postId}-${item.changeType}-${item.versionNumber}-${idx}`}
                                                onClick={() => handleHistoryItemClick(item)}
                                                style={{
                                                    borderBottom: "1px solid #eee",
                                                    cursor: "pointer",
                                                    background: selectedHistoryItem?.postId === item.postId && selectedHistoryItem?.versionNumber === item.versionNumber ? "#e3f2fd" : "transparent",
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!(selectedHistoryItem?.postId === item.postId && selectedHistoryItem?.versionNumber === item.versionNumber)) {
                                                        e.currentTarget.style.background = "#f9f9f9";
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!(selectedHistoryItem?.postId === item.postId && selectedHistoryItem?.versionNumber === item.versionNumber)) {
                                                        e.currentTarget.style.background = "transparent";
                                                    }
                                                }}
                                            >
                                                <td style={{ padding: "12px 14px", fontWeight: 600 }}>{item.postId}</td>
                                                <td style={{ padding: "12px 14px" }}>{categoryLabel}</td>
                                                <td style={{ padding: "12px 14px" }}>{item.changeType}</td>
                                                <td style={{ padding: "12px 14px", fontWeight: 600 }}>{item.postTitle ?? "-"}</td>
                                                <td style={{ padding: "12px 14px" }}>{formatKST(item.changeDate).split(" ")[0]}</td>
                                                <td style={{ padding: "12px 14px" }}>{item.changedBy || "-"}</td>
                                                <td style={{ padding: "12px 14px" }}>{item.versionNumber ?? "-"}</td>
                                                <td style={{ padding: "12px 14px", fontSize: 12 }}>
                                                    {hasAttachments ? (
                                                        <span title={attachNames.join(", ")}>
                                                            📎 {attachNames.length > 2 ? `${attachNames[0]} 외 ${attachNames.length - 1}개` : attachNames.join(", ")}
                                                        </span>
                                                    ) : "-"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {totalPages > 0 && (
                                <div
                                    style={{
                                        marginTop: 16,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: 6,
                                        flexWrap: "wrap",
                                        width: "100%",
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }} />
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                                    <button
                                        type="button"
                                        onClick={() => setHistoryPage(0)}
                                        disabled={historyPage <= 0}
                                        style={{
                                            padding: "8px 12px",
                                            border: "1px solid #444",
                                            borderRadius: 6,
                                            background: "#fff",
                                            cursor: historyPage <= 0 ? "not-allowed" : "pointer",
                                            opacity: historyPage <= 0 ? 0.6 : 1,
                                        }}
                                    >
                                        처음
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i)
                                        .filter((n) => n >= Math.max(0, historyPage - 2) && n <= Math.min(totalPages - 1, historyPage + 2))
                                        .map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setHistoryPage(n)}
                                                style={{
                                                    padding: "8px 12px",
                                                    border: "1px solid #444",
                                                    borderRadius: 6,
                                                    background: n === historyPage ? "#2563eb" : "#fff",
                                                    color: n === historyPage ? "#fff" : "#111",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {n + 1}
                                            </button>
                                        ))}
                                    <button
                                        type="button"
                                        onClick={() => setHistoryPage(Math.max(0, totalPages - 1))}
                                        disabled={historyPage >= totalPages - 1}
                                        style={{
                                            padding: "8px 12px",
                                            border: "1px solid #444",
                                            borderRadius: 6,
                                            background: "#fff",
                                            cursor: historyPage >= totalPages - 1 ? "not-allowed" : "pointer",
                                            opacity: historyPage >= totalPages - 1 ? 0.6 : 1,
                                        }}
                                    >
                                        마지막
                                    </button>
                                    </div>
                                    <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", minWidth: 0 }}>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => setPageSize(Number(e.target.value))}
                                        style={{
                                            padding: "8px 12px",
                                            borderRadius: 6,
                                            border: "1px solid #444",
                                            background: "#fff",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {PAGE_SIZE_OPTIONS.map((n) => (
                                            <option key={n} value={n}>{n}개</option>
                                        ))}
                                    </select>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                /* 목록 뷰 (기존) */
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* 왼쪽: 게시글 목록 */}
                <div
                    style={{
                        border: "1px solid var(--app-border)",
                        borderRadius: 12,
                        padding: 16,
                        background: "var(--app-bg)",
                        maxHeight: "80vh",
                        overflowY: "auto",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontSize: 16, fontWeight: 800 }}>
                            {showDeletedHistory ? "삭제 이력 (최신순)" : "게시글 목록"}
                        </span>
                        <button
                            onClick={() => { setShowDeletedHistory(!showDeletedHistory); setPage(0); }}
                            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #444", cursor: "pointer", fontSize: 13 }}
                        >
                            {showDeletedHistory ? "게시글 목록" : "삭제 이력"}
                        </button>
                    </div>
                    {loading && <div style={{ opacity: 0.8 }}>불러오는 중...</div>}
                    {!loading && deletedPosts.length === 0 && (
                        <div style={{ opacity: 0.6 }}>게시글이 없습니다.</div>
                    )}
                    {!loading &&
                        deletedPosts.map((post) => (
                            <div
                                key={post.id}
                                onClick={() => handlePostClick(post.id)}
                                style={{
                                    padding: 12,
                                    marginBottom: 8,
                                    borderRadius: 8,
                                    border: "1px solid #ddd",
                                    background: selectedPostId === post.id ? "#e3f2fd" : "#f9f9f9",
                                    cursor: "pointer",
                                }}
                            >
                                <div style={{ fontWeight: 700, marginBottom: 4 }}>{post.title}</div>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>
                                    ID: {post.id} | 수정: {formatKST(post.updatedAt)}
                                </div>
                            </div>
                        ))}
                    {!showDeletedHistory && totalPages > 0 && (
                        <div
                            style={{
                                marginTop: 16,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 6,
                                flexWrap: "wrap",
                                width: "100%",
                            }}
                        >
                            <div style={{ flex: 1, minWidth: 0 }} />
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                            <button
                                type="button"
                                onClick={() => setPage(0)}
                                disabled={page <= 0}
                                style={{
                                    padding: "8px 12px",
                                    border: "1px solid #444",
                                    borderRadius: 6,
                                    background: "#fff",
                                    cursor: page <= 0 ? "not-allowed" : "pointer",
                                    opacity: page <= 0 ? 0.6 : 1,
                                }}
                            >
                                처음
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i)
                                .filter((n) => n >= Math.max(0, page - 2) && n <= Math.min(totalPages - 1, page + 2))
                                .map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setPage(n)}
                                        style={{
                                            padding: "8px 12px",
                                            border: "1px solid #444",
                                            borderRadius: 6,
                                            background: n === page ? "#2563eb" : "#fff",
                                            color: n === page ? "#fff" : "#111",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {n + 1}
                                    </button>
                                ))}
                            <button
                                type="button"
                                onClick={() => setPage(Math.max(0, totalPages - 1))}
                                disabled={page >= totalPages - 1}
                                style={{
                                    padding: "8px 12px",
                                    border: "1px solid #444",
                                    borderRadius: 6,
                                    background: "#fff",
                                    cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
                                    opacity: page >= totalPages - 1 ? 0.6 : 1,
                                }}
                            >
                                마지막
                            </button>
                            </div>
                            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", minWidth: 0 }}>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                style={{
                                    padding: "8px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #444",
                                    background: "#fff",
                                    cursor: "pointer",
                                }}
                            >
                                {PAGE_SIZE_OPTIONS.map((n) => (
                                    <option key={n} value={n}>{n}개</option>
                                ))}
                            </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* 오른쪽: 버전 목록 및 내용 */}
                <div
                    style={{
                        border: "1px solid var(--app-border)",
                        borderRadius: 12,
                        padding: 16,
                        background: "var(--app-bg)",
                        maxHeight: "80vh",
                        overflowY: "auto",
                    }}
                >
                    {selectedPostId === null ? (
                        <div style={{ opacity: 0.6 }}>게시글을 선택하세요.</div>
                    ) : (
                        <>
                            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
                                버전 이력 (최신 → 오래된 순)
                            </div>
                            {loading && <div style={{ opacity: 0.8 }}>불러오는 중...</div>}
                            {!loading && versions.length === 0 && (
                                <div style={{ opacity: 0.6 }}>버전 이력이 없습니다.</div>
                            )}
                            {!loading &&
                                versions.map((version) => (
                                    <div
                                        key={version.id}
                                        onClick={() => handleVersionClick(version)}
                                        style={{
                                            padding: 12,
                                            marginBottom: 8,
                                            borderRadius: 8,
                                            border: "1px solid #ddd",
                                            background:
                                                selectedVersion?.id === version.id ? "#e3f2fd" : "#f9f9f9",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                            버전 {version.versionNumber}
                                        </div>
                                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                                            생성: {formatKST(version.createdAt)}
                                            {version.createdBy && ` | 작성자: ${version.createdBy}`}
                                        </div>
                                    </div>
                                ))}
                            {selectedVersion && (
                                <div
                                    style={{
                                        marginTop: 16,
                                        padding: 16,
                                        borderRadius: 8,
                                        border: "1px solid #ddd",
                                        background: "#fff",
                                    }}
                                >
                                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                                        버전 {selectedVersion.versionNumber} 내용
                                    </div>
                                    <div
                                        className="markdown-preview"
                                        data-color-mode="light"
                                        style={{
                                            padding: 16,
                                            background: "var(--app-bg)",
                                            borderRadius: 8,
                                            overflow: "auto",
                                            maxHeight: "50vh",
                                        }}
                                    >
                                        <MarkdownPreview source={selectedVersion.contentMd || ""} />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            )}

            {/* 게시글별 변경 이력 모달 */}
            {postHistoryModalOpen && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                    }}
                    onClick={() => { setPostHistoryModalOpen(false); setSelectedHistoryItem(null); setSelectedVersion(null); }}
                >
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: 12,
                            padding: 24,
                            maxWidth: "95vw",
                            maxHeight: "90vh",
                            overflow: "auto",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                            <div style={{ fontSize: 18, fontWeight: 800 }}>
                                게시글 변경 이력 - ID: {selectedPostIdForModal ?? "-"}
                            </div>
                            <button
                                onClick={() => { setPostHistoryModalOpen(false); setSelectedHistoryItem(null); setSelectedVersion(null); }}
                                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #444", cursor: "pointer", fontWeight: 700 }}
                            >
                                닫기
                            </button>
                        </div>
                        <div style={{ marginBottom: 16, overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid #ddd", background: "#f5f5f5" }}>
                                        <th style={{ padding: "10px", textAlign: "left", fontWeight: 700 }}>글 ID</th>
                                        <th style={{ padding: "10px", textAlign: "left", fontWeight: 700 }}>카테고리</th>
                                        <th style={{ padding: "10px", textAlign: "left", fontWeight: 700 }}>구분</th>
                                        <th style={{ padding: "10px", textAlign: "left", fontWeight: 700 }}>제목</th>
                                        <th style={{ padding: "10px", textAlign: "left", fontWeight: 700 }}>수정일</th>
                                        <th style={{ padding: "10px", textAlign: "left", fontWeight: 700 }}>버전</th>
                                        <th style={{ padding: "10px", textAlign: "left", fontWeight: 700 }}>첨부</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {postHistory.map((item, idx) => {
                                        const categoryLabel = item.categoryId ? (categories.find(c => c.id === item.categoryId)?.label ?? "기타") : labelOfApiCategory(item.category);
                                        const attachNames = parseAttachmentDisplayNames(item.attachments);
                                        const hasAttachments = attachNames.length > 0;
                                        const isSelected = selectedHistoryItem?.postId === item.postId && selectedHistoryItem?.versionNumber === item.versionNumber;
                                        return (
                                            <tr
                                                key={`${item.postId}-${item.changeType}-${item.versionNumber}-${idx}`}
                                                onClick={() => handlePostHistoryRowClick(item)}
                                                style={{
                                                    borderBottom: "1px solid #eee",
                                                    cursor: "pointer",
                                                    background: isSelected ? "#e3f2fd" : "transparent",
                                                }}
                                                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#f9f9f9"; }}
                                                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                                            >
                                                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{item.postId}</td>
                                                <td style={{ padding: "10px 12px" }}>{categoryLabel}</td>
                                                <td style={{ padding: "10px 12px" }}>{item.changeType}</td>
                                                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{item.postTitle ?? "-"}</td>
                                                <td style={{ padding: "10px 12px" }}>{formatKST(item.changeDate).split(" ")[0]}</td>
                                                <td style={{ padding: "10px 12px" }}>{item.versionNumber ?? "-"}</td>
                                                <td style={{ padding: "10px 12px", fontSize: 12 }}>
                                                    {hasAttachments ? (
                                                        <span title={attachNames.join(", ")}>
                                                            📎 {attachNames.length > 2 ? `${attachNames[0]} 외 ${attachNames.length - 1}개` : attachNames.join(", ")}
                                                        </span>
                                                    ) : "-"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {selectedVersion && selectedHistoryItem?.changeType !== "삭제" && (
                            <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 16 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700 }}>
                                        버전 {selectedVersion.versionNumber} · {selectedHistoryItem?.postTitle ?? ""}
                                    </span>
                                    <Link
                                        to={`/posts/${selectedHistoryItem!.postId}/versions/${selectedVersion.versionNumber}`}
                                        style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #444", background: "#fff", color: "#111", textDecoration: "none", fontWeight: 600, fontSize: 13 }}
                                        onClick={() => setPostHistoryModalOpen(false)}
                                    >
                                        전체 화면 보기
                                    </Link>
                                </div>
                                <div className="markdown-preview" data-color-mode="light" style={{ padding: 16, background: "#f9f9f9", borderRadius: 8, maxHeight: 300, overflow: "auto" }}>
                                    <MarkdownPreview source={selectedVersion.contentMd || ""} />
                                </div>
                            </div>
                        )}
                        {selectedHistoryItem?.changeType === "삭제" && (
                            <div style={{ marginTop: 16, padding: 16, background: "#f5f5f5", borderRadius: 8, color: "#666" }}>
                                삭제된 게시글은 내용을 조회할 수 없습니다.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
