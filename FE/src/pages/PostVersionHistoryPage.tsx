import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDeletionHistory, getPostVersions, listDeletedPosts, getAllChangeHistory, getPostVersion, type PostListItem, type PostVersion, type ChangeHistoryItem, ApiError } from "../lib/api";
import MarkdownPreview from "@uiw/react-markdown-preview";
import "@uiw/react-markdown-preview/markdown.css";
import { fetchCategories, type CategoryItem } from "../lib/api";
import { labelOfApiCategory } from "../lib/categories";

function formatKST(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
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

    const loadDeletedPosts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const postIdNum = searchPostId.trim() ? Number(searchPostId.trim()) : undefined;
            const result = await listDeletedPosts(
                searchKeyword.trim() || undefined,
                postIdNum,
                page,
                20
            );
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
    }, [searchKeyword, searchPostId, page]);

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
        setLoading(true);
        setError(null);
        try {
            const filter = changeTypeFilter === "전체" ? undefined : changeTypeFilter;
            const history = await getAllChangeHistory(filter);
            
            // 검색 필터 적용
            let filtered = history;
            if (searchKeyword.trim()) {
                if (searchType === "제목") {
                    filtered = filtered.filter(item => 
                        item.postTitle.toLowerCase().includes(searchKeyword.toLowerCase())
                    );
                } else {
                    const id = Number(searchKeyword.trim());
                    if (!isNaN(id)) {
                        filtered = filtered.filter(item => item.postId === id);
                    }
                }
            }
            
            setChangeHistory(filtered);
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
    }, [changeTypeFilter, searchKeyword, searchType]);

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

    const handleSearch = () => {
        setPage(0);
        if (viewMode === "table") {
            loadChangeHistory();
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
                    onChange={(e) => {
                        setChangeTypeFilter(e.target.value as "전체" | "생성" | "수정" | "삭제");
                        if (viewMode === "table") {
                            setTimeout(() => loadChangeHistory(), 0);
                        }
                    }}
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
                        if (viewMode === "table") {
                            loadChangeHistory();
                        } else {
                            handleSearch();
                        }
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
                                        const hasAttachments = item.attachments && item.attachments !== "null" && item.attachments.trim() !== "" && item.attachments.trim() !== "[]";
                                        
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
                                                <td style={{ padding: "12px 14px" }}>{categoryLabel}</td>
                                                <td style={{ padding: "12px 14px" }}>{item.changeType}</td>
                                                <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                                                    {item.postTitle}
                                                    {item.changeType === "생성" && item.versionNumber === 1 && (
                                                        <span style={{ fontSize: 11, color: "#666", marginLeft: 8 }}>
                                                            (이름 클릭 시 해당 버전의 .md 파일 조회)
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: "12px 14px" }}>{formatKST(item.changeDate).split(" ")[0]}</td>
                                                <td style={{ padding: "12px 14px" }}>{item.changedBy || "-"}</td>
                                                <td style={{ padding: "12px 14px" }}>{item.versionNumber ?? "-"}</td>
                                                <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                                    {hasAttachments ? "📎" : "-"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {selectedVersion && (
                                <div style={{ marginTop: 24, padding: 16, borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}>
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
                                            maxHeight: "60vh",
                                        }}
                                    >
                                        <MarkdownPreview source={selectedVersion.contentMd || ""} />
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
                    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
                        {showDeletedHistory ? "삭제 이력 (최신순)" : "게시글 목록"}
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
                    {!showDeletedHistory && totalPages > 1 && (
                        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
                            <button
                                onClick={() => setPage(Math.max(0, page - 1))}
                                disabled={page === 0}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #444",
                                    background: page === 0 ? "#e5e5e5" : "#fff",
                                    cursor: page === 0 ? "not-allowed" : "pointer",
                                }}
                            >
                                이전
                            </button>
                            <span style={{ padding: "6px 12px" }}>
                                {page + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                                disabled={page >= totalPages - 1}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #444",
                                    background: page >= totalPages - 1 ? "#e5e5e5" : "#fff",
                                    cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
                                }}
                            >
                                다음
                            </button>
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
        </div>
    );
}
