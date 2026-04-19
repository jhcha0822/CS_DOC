import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, createSearchParams, useNavigate, useSearchParams } from "react-router-dom";
import { fetchCategories, fetchPosts, type CategoryItem, type PostListItem, type SearchIn } from "../lib/api";
import { labelOfApiCategory } from "../lib/categories";
import ErrorModal from "../components/ErrorModal";

const PAGE_SIZE_OPTIONS = [10, 15, 20] as const;

function formatKSTDateTime(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const SEARCH_IN_OPTIONS: Array<{ value: SearchIn; label: string }> = [
    { value: "title", label: "제목" },
    { value: "content", label: "내용" },
    { value: "author", label: "작성자" },
    { value: "all", label: "모두포함" },
];


export default function PostListPage() {
    const navigate = useNavigate();
    const [sp, setSp] = useSearchParams();
    const catParam = sp.get("cat");
    const categoryId = catParam ? parseInt(catParam, 10) : null;
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);

    useEffect(() => {
        fetchCategories()
            .then((list) => {
                setCategories(list);
                setCategoriesLoading(false);
            })
            .catch(() => {
                setCategoriesLoading(false);
            });
    }, []);

    const currentCategory = useMemo(() => {
        if (!categoryId) return null;
        return categories.find((c) => c.id === categoryId);
    }, [categoryId, categories]);

    const pageTitle = useMemo(() => {
        if (!currentCategory) return "전체";
        return currentCategory.label;
    }, [currentCategory]);

    const qFromUrl = sp.get("q") ?? "";
    const searchInFromUrl = (sp.get("searchIn") as SearchIn) || "title";
    const pageFromUrl = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const sizeFromUrl = (() => {
        const s = parseInt(sp.get("size") ?? "10", 10);
        return PAGE_SIZE_OPTIONS.includes(s as 10 | 15 | 20) ? s : 10;
    })();
    const [inputQ, setInputQ] = useState(qFromUrl);
    const [searchIn, setSearchIn] = useState<SearchIn>(
        SEARCH_IN_OPTIONS.some((o) => o.value === searchInFromUrl) ? searchInFromUrl : "title"
    );
    const isComposingRef = useRef(false);

    useEffect(() => {
        if (SEARCH_IN_OPTIONS.some((o) => o.value === searchInFromUrl)) {
            setSearchIn(searchInFromUrl);
        }
    }, [searchInFromUrl]);

    // URL → 입력창 동기화: 조합 중에는 덮어쓰지 않아 한글 마지막 글자가 보이도록 함
    useEffect(() => {
        if (!isComposingRef.current) {
            setInputQ(qFromUrl);
        }
    }, [qFromUrl]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<PostListItem[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const commitSearch = useCallback(
        (value: string) => {
            const next = new URLSearchParams(sp);
            if (value.trim()) next.set("q", value.trim());
            else next.delete("q");
            if (searchIn !== "title") next.set("searchIn", searchIn);
            else next.delete("searchIn");
            next.delete("page");
            setSp(next, { replace: true });
        },
        [sp, setSp, searchIn]
    );

    const setSearchInParam = useCallback(
        (value: SearchIn) => {
            setSearchIn(value);
            const next = new URLSearchParams(sp);
            if (value !== "title") next.set("searchIn", value);
            else next.delete("searchIn");
            next.delete("page");
            setSp(next, { replace: true });
        },
        [sp, setSp]
    );

    const setPage = useCallback(
        (page: number) => {
            const next = new URLSearchParams(sp);
            if (page <= 1) next.delete("page");
            else next.set("page", String(page));
            setSp(next, { replace: true });
        },
        [sp, setSp]
    );

    const setPageSize = useCallback(
        (size: number) => {
            const next = new URLSearchParams(sp);
            if (size === 10) next.delete("size");
            else next.set("size", String(size));
            next.delete("page");
            setSp(next, { replace: true });
        },
        [sp, setSp]
    );

    useEffect(() => {
        let cancelled = false;

        async function run() {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchPosts({
                    categoryId: categoryId ?? undefined,
                    q: qFromUrl.trim() || undefined,
                    searchIn: searchInFromUrl,
                    page: pageFromUrl - 1,
                    size: sizeFromUrl,
                });
                if (cancelled) return;
                setItems(data.items ?? []);
                setTotalElements(data.totalElements ?? 0);
                setTotalPages(data.totalPages ?? 1);
            } catch (e) {
                if (cancelled) return;
                const msg =
                    e instanceof Error ? e.message : "목록을 불러오지 못했습니다.";
                setError(msg);
                setItems([]);
                setTotalElements(0);
                setTotalPages(0);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [categoryId, qFromUrl, searchInFromUrl, pageFromUrl, sizeFromUrl]);


    // Enter 또는 '검색' 버튼 클릭 시에만 URL(q=) 반영 및 목록 조회. 입력 중에는 파라미터 전달하지 않음.
    const onSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const v = inputQ.trim();
        setInputQ(v);
        commitSearch(v);
    };

    const onReset = () => {
        setInputQ("");
        commitSearch("");
    };

    const onCompositionStart = () => {
        isComposingRef.current = true;
    };

    const onCompositionEnd = (
        e: React.CompositionEvent<HTMLInputElement>
    ) => {
        const target = e.target as HTMLInputElement;
        setInputQ(target.value ?? "");
        isComposingRef.current = false;
    };

    const listSearchParams = useMemo(() => {
        const p: Record<string, string> = {};
        if (categoryId != null) p.cat = String(categoryId);
        if (qFromUrl) p.q = qFromUrl;
        if (searchInFromUrl !== "title") p.searchIn = searchInFromUrl;
        if (pageFromUrl > 1) p.page = String(pageFromUrl);
        if (sizeFromUrl !== 10) p.size = String(sizeFromUrl);
        return p;
    }, [categoryId, qFromUrl, searchInFromUrl, pageFromUrl, sizeFromUrl]);

    const pageNumbers = useMemo(() => {
        const total = Math.max(1, totalPages);
        const current = Math.min(Math.max(1, pageFromUrl), total);
        const PAGE_GROUP = 10;
        const groupIndex = Math.floor((current - 1) / PAGE_GROUP);
        const startPage = groupIndex * PAGE_GROUP + 1;
        const endPage = Math.min(startPage + PAGE_GROUP - 1, total);
        const nums: number[] = [];
        for (let i = startPage; i <= endPage; i++) nums.push(i);
        const hasPrevBlock = startPage > 1;
        const hasNextBlock = endPage < total;
        return { nums, total, current, startPage, endPage, hasPrevBlock, hasNextBlock };
    }, [totalPages, pageFromUrl]);

    return (
        <div>
            <div className="header-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <div>
                    <div style={{ fontSize: 26, fontWeight: 900 }}>{categoriesLoading ? "불러오는 중..." : pageTitle}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Link
                        to={`/posts/new?${createSearchParams(listSearchParams).toString()}`}
                        style={{
                            padding: "10px 12px",
                            borderRadius: 6,
                            border: "none",
                            textDecoration: "none",
                            color: "#fff",
                            background: "#3B82F6",
                            fontWeight: 500,
                            fontSize: 14,
                        }}
                    >
                        게시글 등록
                    </Link>
                </div>
            </div>


            <form
                onSubmit={onSearchSubmit}
                style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    width: "100%",
                }}
            >
                <select
                    value={searchIn}
                    onChange={(e) => setSearchInParam(e.target.value as SearchIn)}
                    style={{
                        padding: "10px 12px",
                        paddingRight: 28,
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                        background: "#fff",
                        color: "#374151",
                        fontWeight: 500,
                        cursor: "pointer",
                        outline: "none",
                    }}
                >
                    {SEARCH_IN_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    value={inputQ}
                    onChange={(e) => setInputQ(e.target.value)}
                    onCompositionStart={onCompositionStart}
                    onCompositionEnd={onCompositionEnd}
                    placeholder="검색어를 입력하세요."
                    style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                        background: "#fff",
                        color: "#374151",
                        outline: "none",
                    }}
                />
                <button
                    type="submit"
                    style={{
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: "none",
                        background: "#f3f4f6",
                        color: "#374151",
                        fontWeight: 500,
                        cursor: "pointer",
                    }}
                >
                    검색
                </button>
                <button
                    type="button"
                    onClick={onReset}
                    style={{
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: "none",
                        background: "#f3f4f6",
                        color: "#374151",
                        fontWeight: 500,
                        cursor: "pointer",
                    }}
                >
                    초기화
                </button>
            </form>

            {loading && (
                <div style={{ marginTop: 14, opacity: 0.8 }}>불러오는 중...</div>
            )}
            {!loading && !error && items.length > 0 && (
                <div style={{ marginTop: 14, marginBottom: 6, fontSize: 14, opacity: 0.85 }}>
                    총 {totalElements}개 (현재 {items.length}개 표시)
                </div>
            )}
            {!loading && !error && (
                <div style={{ marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", tableLayout: "fixed" }}>
                        <colgroup>
                            <col style={{ width: "14%" }} />
                            <col style={{ width: "42%" }} />
                            <col style={{ width: "14%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "6%" }} />
                            <col style={{ width: "6%" }} />
                            <col style={{ width: "8%" }} />
                        </colgroup>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #d1d5db", background: "#f3f4f6" }}>
                                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>카테고리</th>
                                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>제목</th>
                                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>작성일</th>
                                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>작성자</th>
                                <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 600, color: "#374151" }}>조회</th>
                                <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 600, color: "#374151" }}>첨부</th>
                                <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 600, color: "#374151" }}>댓글</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: 24, textAlign: "center", opacity: 0.8 }}>
                                        게시글이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                items.map((post) => {
                                    const detailParams = { ...listSearchParams, from: "list" };
                                    const basePath = post.postKind === "ASSIGNMENT" ? `/posts/${post.id}/assignment` : `/posts/${post.id}`;
                                    const detailUrl = `${basePath}?${createSearchParams(detailParams).toString()}`;
                                    const isNotice = post.isNotice === true;
                                    return (
                                        <tr
                                            key={post.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => navigate(detailUrl)}
                                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(detailUrl); } }}
                                            style={{
                                                borderBottom: "1px solid #e5e7eb",
                                                background: isNotice ? "#fee2e2" : "#fff",
                                                fontWeight: isNotice ? 700 : 400,
                                                cursor: "pointer",
                                            }}
                                        >
                                            <td style={{ padding: "12px 14px" }}>
                                                {isNotice 
                                                    ? "공지사항"
                                                    : (post.categoryId 
                                                        ? (categories.find(c => c.id === post.categoryId)?.label ?? "기타")
                                                        : labelOfApiCategory(post.category))}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "12px 14px",
                                                    color: "var(--app-text)",
                                                    fontWeight: isNotice ? 700 : 600,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}
                                                title={post.title}
                                            >
                                                {post.title}
                                            </td>
                                            <td style={{ padding: "12px 14px" }}>
                                                {formatKSTDateTime(post.createdAt)}
                                            </td>
                                            <td style={{ padding: "12px 14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {post.createdByName ?? "-"}
                                            </td>
                                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                                {post.viewCount ?? 0}
                                            </td>
                                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                                {(() => {
                                                    try {
                                                        if (post.attachments && post.attachments !== "null" && post.attachments.trim() !== "" && post.attachments.trim() !== "[]") {
                                                            let parsed: string[] = [];
                                                            try {
                                                                parsed = JSON.parse(post.attachments);
                                                            } catch (parseError) {
                                                                // JSON 파싱 실패 시 문자열로 처리
                                                                const trimmed = post.attachments.trim();
                                                                if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
                                                                    parsed = [trimmed.slice(1, -1)];
                                                                } else if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                                                                    const content = trimmed.slice(1, -1).trim();
                                                                    if (content) {
                                                                        parsed = content.split(",").map(s => {
                                                                            const trimmed = s.trim();
                                                                            return trimmed.startsWith("\"") && trimmed.endsWith("\"") 
                                                                                ? trimmed.slice(1, -1) 
                                                                                : trimmed;
                                                                        });
                                                                    }
                                                                } else {
                                                                    parsed = [trimmed];
                                                                }
                                                            }
                                                            const hasAttachment = Array.isArray(parsed) && parsed.length > 0 && parsed.some((item: unknown) => {
                                                                if (item == null) return false;
                                                                if (typeof item === "string") return item.trim() !== "";
                                                                if (typeof item === "object" && item !== null && "url" in item) return true;
                                                                return false;
                                                            });
                                                            if (hasAttachment) {
                                                                return <span style={{ fontSize: 16 }}>📎</span>;
                                                            }
                                                        }
                                                    } catch (e) {
                                                        console.error("[PostList] Error parsing attachments:", e, post.attachments);
                                                    }
                                                    return "-";
                                                })()}
                                            </td>
                                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                                {post.commentCount ?? 0}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && !error && totalPages > 0 && (
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
                        onClick={() => setPage(1)}
                        disabled={pageFromUrl <= 1}
                        style={{
                            padding: "8px 12px",
                            border: "none",
                            borderRadius: 6,
                            background: "#f3f4f6",
                            color: "#374151",
                            cursor: pageFromUrl <= 1 ? "not-allowed" : "pointer",
                            opacity: pageFromUrl <= 1 ? 0.6 : 1,
                        }}
                    >
                        처음
                    </button>
                    {pageNumbers.hasPrevBlock && (
                        <button
                            type="button"
                            onClick={() => setPage(pageNumbers.startPage - 1)}
                            style={{ padding: "8px 12px", border: "none", borderRadius: 6, background: "#f3f4f6", color: "#374151", cursor: "pointer" }}
                            title="이전 10페이지"
                        >
                            …
                        </button>
                    )}
                    {pageNumbers.nums.map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => setPage(n)}
                            style={{
                                padding: "8px 12px",
                                border: "none",
                                borderRadius: 6,
                                background: n === pageFromUrl ? "#3B82F6" : "#f3f4f6",
                                color: n === pageFromUrl ? "#fff" : "#374151",
                                cursor: "pointer",
                            }}
                        >
                            {n}
                        </button>
                    ))}
                    {pageNumbers.hasNextBlock && (
                        <button
                            type="button"
                            onClick={() => setPage(pageNumbers.endPage + 1)}
                            style={{ padding: "8px 12px", border: "none", borderRadius: 6, background: "#f3f4f6", color: "#374151", cursor: "pointer" }}
                            title="다음 10페이지"
                        >
                            …
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setPage(totalPages)}
                        disabled={pageFromUrl >= totalPages}
                        style={{
                            padding: "8px 12px",
                            border: "none",
                            borderRadius: 6,
                            background: "#f3f4f6",
                            color: "#374151",
                            cursor: pageFromUrl >= totalPages ? "not-allowed" : "pointer",
                            opacity: pageFromUrl >= totalPages ? 0.6 : 1,
                        }}
                    >
                        마지막
                    </button>
                    </div>
                    <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", minWidth: 0 }}>
                    <select
                        value={sizeFromUrl}
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
            <ErrorModal open={!!error} message={error ?? ""} onClose={() => setError(null)} />
        </div>
    );
}
