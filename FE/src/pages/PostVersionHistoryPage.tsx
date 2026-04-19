import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getAllChangeHistory, getPostVersion, getChangeHistoryForPost, type PostVersion, type ChangeHistoryItem, ApiError } from "../lib/api";
import MarkdownPreview from "@uiw/react-markdown-preview";
import "@uiw/react-markdown-preview/markdown.css";
import { markdownPreviewImageComponents } from "../components/MarkdownImageWithModal";
import { fetchCategories, type CategoryItem } from "../lib/api";
import { labelOfApiCategory } from "../lib/categories";
import ErrorModal from "../components/ErrorModal";

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
    const [searchKeyword, setSearchKeyword] = useState("");
    const [_searchPostId, setSearchPostId] = useState("");
    const [searchType, setSearchType] = useState<"제목" | "ID">("제목");
    const [changeTypeFilter, setChangeTypeFilter] = useState<"전체" | "생성" | "수정" | "삭제">("전체");
    const [selectedVersion, setSelectedVersion] = useState<PostVersion | null>(null);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<ChangeHistoryItem | null>(null);
    const [changeHistory, setChangeHistory] = useState<ChangeHistoryItem[]>([]);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [historyPage, setHistoryPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [postHistoryModalOpen, setPostHistoryModalOpen] = useState(false);
    const [postHistory, setPostHistory] = useState<ChangeHistoryItem[]>([]);
    const [selectedPostIdForModal, setSelectedPostIdForModal] = useState<number | null>(null);
    const [pageSize, setPageSize] = useState(10);
    const loadReqIdRef = useRef(0);

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
        loadChangeHistory();
    }, [loadChangeHistory]);

    useEffect(() => {
        setHistoryPage(0);
    }, [changeTypeFilter, searchKeyword, searchType]);

    useEffect(() => {
        setHistoryPage(0);
    }, [pageSize]);

    const handleSearch = () => {
        setHistoryPage(0);
        loadChangeHistory();
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
            <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", width: "100%" }}>
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
                        flex: 1,
                        minWidth: 200,
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #444",
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
                        setHistoryPage(0);
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
            </div>

            {/* 변경 이력 단일 테이블 */}
            <div style={{ border: "1px solid var(--app-border)", borderRadius: 12, padding: 16, background: "var(--app-bg)" }}>
                {loading && <div style={{ opacity: 0.8, padding: 20 }}>불러오는 중...</div>}
                {!loading && changeHistory.length === 0 && (
                    <div style={{ opacity: 0.6, padding: 20 }}>변경 이력이 없습니다.</div>
                )}
                {!loading && changeHistory.length > 0 && (
                    <>
                        <div style={{ overflowX: "auto" }}>
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
                        </div>
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
                                    {(() => {
                                        const PAGE_GROUP = 10;
                                        const groupIndex = Math.floor(historyPage / PAGE_GROUP);
                                        const startPage = groupIndex * PAGE_GROUP;
                                        const endPage = Math.min(startPage + PAGE_GROUP, totalPages);
                                        const hasPrevBlock = startPage > 0;
                                        const hasNextBlock = endPage < totalPages;
                                        return (
                                            <>
                                                {hasPrevBlock && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setHistoryPage(startPage - 1)}
                                                        style={{ padding: "8px 12px", border: "1px solid #444", borderRadius: 6, background: "#fff", cursor: "pointer" }}
                                                        title="이전 10페이지"
                                                    >
                                                        …
                                                    </button>
                                                )}
                                                {Array.from({ length: endPage - startPage }, (_, i) => startPage + i).map((n) => (
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
                                                {hasNextBlock && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setHistoryPage(endPage)}
                                                        style={{ padding: "8px 12px", border: "1px solid #444", borderRadius: 6, background: "#fff", cursor: "pointer" }}
                                                        title="다음 10페이지"
                                                    >
                                                        …
                                                    </button>
                                                )}
                                            </>
                                        );
                                    })()}
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
                                        <th style={{ padding: "10px", textAlign: "left", fontWeight: 700 }}>사용자</th>
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
                                                <td style={{ padding: "10px 12px" }}>{item.changedBy || "-"}</td>
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
                                    <MarkdownPreview components={markdownPreviewImageComponents} source={selectedVersion.contentMd || ""} />
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
            <ErrorModal open={!!error} message={error ?? ""} onClose={() => setError(null)} />
        </div>
    );
}
