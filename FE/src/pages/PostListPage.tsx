import { useEffect, useMemo, useState } from "react";
import { Link, createSearchParams, useSearchParams } from "react-router-dom";
import { fetchPosts, type PostListItem } from "../lib/api";
import {
    DEFAULT_CATEGORY,
    getApiCategoriesByKey,
    isCategoryKey,
    labelOfApiCategory,
    type CategoryKey,
} from "../lib/categories";

function formatKST(iso: string) {
    // ISO -> "YYYY.MM.DD HH:mm"
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
}

export default function PostListPage() {
    const [sp, setSp] = useSearchParams();

    const categoryParam = sp.get("category");
    const currentKey: CategoryKey = isCategoryKey(categoryParam)
        ? categoryParam
        : DEFAULT_CATEGORY;

    const [q, setQ] = useState(sp.get("q") ?? "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<PostListItem[]>([]);

    // 현재 선택 카테고리가 의미하는 BE 카테고리들
    const allowedApiCats = useMemo(() => getApiCategoriesByKey(currentKey), [currentKey]);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            setLoading(true);
            setError(null);

            try {
                // 1) 서버에 categories를 보내서 "지원하면" 필터링
                // 2) 서버가 무시해도 아래에서 FE에서 다시 필터링
                const data = await fetchPosts({
                    categories: allowedApiCats,
                    q: (sp.get("q") ?? "").trim() || undefined,
                });

                if (cancelled) return;

                // 안전장치: 서버가 전체를 내려줘도 FE에서 확실히 필터링
                const filtered = (data.items ?? []).filter((it) =>
                    allowedApiCats.includes(it.category)
                );

                setItems(filtered);
            } catch (e: any) {
                if (cancelled) return;
                setError(e?.message || "목록을 불러오지 못했습니다.");
                setItems([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [allowedApiCats, sp]);

    const title = useMemo(() => {
        switch (currentKey) {
            case "training":
                return "실습";
            case "incident":
                return "장애 지원";
            case "system":
                return "업무시스템";
            case "newbie":
            default:
                return "신입 교육 자료";
        }
    }, [currentKey]);

    const onSearch = () => {
        const next = new URLSearchParams(sp);
        if (q.trim()) next.set("q", q.trim());
        else next.delete("q");
        // category는 유지
        setSp(next, { replace: true });
    };

    const onReset = () => {
        setQ("");
        const next = new URLSearchParams(sp);
        next.delete("q");
        setSp(next, { replace: true });
    };

    return (
        <div>
            {/* 상단 헤더 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <div>
                    <div style={{ fontSize: 26, fontWeight: 900 }}>{title}</div>
                </div>

                <Link
                    to={`/posts/new?${createSearchParams({ category: currentKey }).toString()}`}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        textDecoration: "none",
                        color: "#eaeaea",
                        background: "#1e1e1e",
                        fontWeight: 800,
                    }}
                >
                    + 새 글
                </Link>
            </div>

            {/* 검색 */}
            <div
                style={{
                    marginTop: 14,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                }}
            >
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onSearch();
                    }}
                    placeholder="검색어"
                    style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        background: "#0f0f0f",
                        color: "#eaeaea",
                        outline: "none",
                    }}
                />
                <button
                    onClick={onSearch}
                    style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        background: "#eaeaea",
                        color: "#111",
                        fontWeight: 800,
                        cursor: "pointer",
                    }}
                >
                    검색
                </button>
                <button
                    onClick={onReset}
                    style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        background: "#eaeaea",
                        color: "#111",
                        fontWeight: 800,
                        cursor: "pointer",
                    }}
                >
                    초기화
                </button>
            </div>

            {/* 상태 표시 */}
            {loading && (
                <div style={{ marginTop: 14, opacity: 0.8 }}>불러오는 중...</div>
            )}
            {error && (
                <div style={{ marginTop: 14, color: "#ff6b6b", fontWeight: 700 }}>{error}</div>
            )}

            {/* 목록 */}
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                {!loading && !error && items.length === 0 && (
                    <div style={{ opacity: 0.8, marginTop: 8 }}>게시글이 없습니다.</div>
                )}

                {items.map((post) => {
                    const detailUrl = `/posts/${post.id}?${createSearchParams({
                        category: currentKey,
                    }).toString()}`;

                    return (
                        <div
                            key={post.id}
                            style={{
                                border: "1px solid #2a2a2a",
                                borderRadius: 14,
                                background: "#101010",
                                padding: 14,
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 16,
                                    alignItems: "start",
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    {/* 제목 = 상세 링크 */}
                                    <Link
                                        to={detailUrl}
                                        style={{
                                            display: "inline-block",
                                            fontSize: 18,
                                            fontWeight: 900,
                                            color: "#eaeaea",
                                            textDecoration: "none",
                                            lineHeight: 1.3,
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        {post.title}
                                    </Link>

                                    {/* 카테고리 한글명만 표시 (본문/미리보기는 아예 제거) */}
                                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                                        {labelOfApiCategory(post.category)}
                                    </div>
                                </div>

                                {/* 수정일 오른쪽 정렬 */}
                                <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: "nowrap" }}>
                                    {formatKST(post.updatedAt)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
