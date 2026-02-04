import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, createSearchParams, useSearchParams } from "react-router-dom";
import { fetchCategories, fetchPosts, type CategoryItem, type PostListItem, type SearchIn } from "../lib/api";
import { labelOfApiCategory } from "../lib/categories";

const PAGE_SIZE = 10;

function formatKST(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const SEARCH_IN_OPTIONS: Array<{ value: SearchIn; label: string }> = [
    { value: "title", label: "제목" },
    { value: "content", label: "내용" },
    { value: "author", label: "작성자" },
    { value: "all", label: "모두포함" },
];


export default function PostListPage() {
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

    const sortedCategories = useMemo(() => {
        return [...categories].sort((a, b) => {
            if (a.depth !== b.depth) return a.depth - b.depth;
            if (a.depth === 0) return a.sortOrder - b.sortOrder;
            if (a.parentId !== b.parentId) {
                const aParent = categories.find((c) => c.id === a.parentId);
                const bParent = categories.find((c) => c.id === b.parentId);
                if (aParent && bParent) {
                    const parentOrder = aParent.sortOrder - bParent.sortOrder;
                    if (parentOrder !== 0) return parentOrder;
                }
                return (a.parentId ?? 0) - (b.parentId ?? 0);
            }
            return a.sortOrder - b.sortOrder;
        });
    }, [categories]);

    const topLevelCategories = useMemo(() => {
        return sortedCategories.filter((c) => c.depth === 0);
    }, [sortedCategories]);

    const getChildrenOf = useCallback((parentId: number) => {
        return sortedCategories.filter((c) => c.parentId === parentId);
    }, [sortedCategories]);

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

    const setCat = useCallback(
        (categoryId: number | null) => {
            const next = new URLSearchParams(sp);
            if (categoryId != null) next.set("cat", String(categoryId));
            else next.delete("cat");
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
                    size: PAGE_SIZE,
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
    }, [categoryId, qFromUrl, searchInFromUrl, pageFromUrl]);


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
        return p;
    }, [categoryId, qFromUrl, searchInFromUrl, pageFromUrl]);

    const pageNumbers = useMemo(() => {
        const total = Math.max(1, totalPages);
        const current = Math.min(Math.max(1, pageFromUrl), total);
        const delta = 2;
        const start = Math.max(1, current - delta);
        const end = Math.min(total, current + delta);
        const nums: number[] = [];
        for (let i = start; i <= end; i++) nums.push(i);
        return { nums, total, current };
    }, [totalPages, pageFromUrl]);

    return (
        <div>
            <div className="header-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <div>
                    <div style={{ fontSize: 26, fontWeight: 900 }}>{categoriesLoading ? "불러오는 중..." : pageTitle}</div>
                </div>
                <Link
                    to={`/posts/new?${createSearchParams(listSearchParams).toString()}`}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #444",
                        textDecoration: "none",
                        color: "#fff",
                        background: "#2563eb",
                        fontWeight: 800,
                    }}
                >
                    등록
                </Link>
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
                        borderRadius: 10,
                        border: "1px solid #444",
                        background: "#fff",
                        color: "#111",
                        fontWeight: 600,
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
                        borderRadius: 10,
                        border: "1px solid #444",
                        background: "#f5f5f5",
                        color: "#111",
                        outline: "none",
                    }}
                />
                <button
                    type="submit"
                    style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #444",
                        background: "#fff",
                        color: "#111",
                        fontWeight: 800,
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
                        borderRadius: 10,
                        border: "1px solid #444",
                        background: "#fff",
                        color: "#111",
                        fontWeight: 800,
                        cursor: "pointer",
                    }}
                >
                    초기화
                </button>
            </form>

            {loading && (
                <div style={{ marginTop: 14, opacity: 0.8 }}>불러오는 중...</div>
            )}
            {error && (
                <div style={{ marginTop: 14, color: "var(--app-error)", fontWeight: 700 }}>
                    {error}
                </div>
            )}

            {!loading && !error && (
                <div style={{ marginTop: 14, border: "1px solid #444", borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #444", background: "#f5f5f5" }}>
                                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700 }}>카테고리</th>
                                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700 }}>제목</th>
                                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700 }}>작성일</th>
                                <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700 }}>조회</th>
                                <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700 }}>첨부</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: 24, textAlign: "center", opacity: 0.8 }}>
                                        게시글이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                items.map((post, idx) => {
                                    const detailUrl = `/posts/${post.id}?${createSearchParams(listSearchParams).toString()}`;
                                    return (
                                        <tr
                                            key={post.id}
                                            style={{
                                                borderBottom: "1px solid #ddd",
                                                background: idx % 2 === 0 ? "#fff" : "#fafafa",
                                            }}
                                        >
                                            <td style={{ padding: "12px 14px" }}>{labelOfApiCategory(post.category)}</td>
                                            <td style={{ padding: "12px 14px" }}>
                                                <Link
                                                    to={detailUrl}
                                                    style={{
                                                        color: "var(--app-text)",
                                                        textDecoration: "none",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {post.title}
                                                </Link>
                                            </td>
                                            <td style={{ padding: "12px 14px" }}>{formatKST(post.createdAt)}</td>
                                            <td style={{ padding: "12px 14px", textAlign: "center" }}>-</td>
                                            <td style={{ padding: "12px 14px", textAlign: "center" }}>-</td>
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
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setPage(1)}
                        disabled={pageFromUrl <= 1}
                        style={{
                            padding: "8px 12px",
                            border: "1px solid #444",
                            borderRadius: 6,
                            background: "#fff",
                            cursor: pageFromUrl <= 1 ? "not-allowed" : "pointer",
                            opacity: pageFromUrl <= 1 ? 0.6 : 1,
                        }}
                    >
                        처음
                    </button>
                    {pageNumbers.nums.map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => setPage(n)}
                            style={{
                                padding: "8px 12px",
                                border: "1px solid #444",
                                borderRadius: 6,
                                background: n === pageFromUrl ? "#2563eb" : "#fff",
                                color: n === pageFromUrl ? "#fff" : "#111",
                                cursor: "pointer",
                            }}
                        >
                            {n}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setPage(totalPages)}
                        disabled={pageFromUrl >= totalPages}
                        style={{
                            padding: "8px 12px",
                            border: "1px solid #444",
                            borderRadius: 6,
                            background: "#fff",
                            cursor: pageFromUrl >= totalPages ? "not-allowed" : "pointer",
                            opacity: pageFromUrl >= totalPages ? 0.6 : 1,
                        }}
                    >
                        마지막
                    </button>
                </div>
            )}
        </div>
    );
}
