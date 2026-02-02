import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, createSearchParams, useSearchParams } from "react-router-dom";
import { fetchPosts, type PostListItem } from "../lib/api";
import {
    getApiCategoriesFromCatParam,
    getCurrentCategoryKeyFromCatParam,
    labelOfApiCategory,
    NAV_ITEMS,
} from "../lib/categories";

function formatKST(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
}

export default function PostListPage() {
    const [sp, setSp] = useSearchParams();
    const catParam = sp.get("cat");
    const currentKey = getCurrentCategoryKeyFromCatParam(catParam);
    const allowedApiCats = useMemo(
        () => getApiCategoriesFromCatParam(catParam),
        [catParam]
    );

    const qFromUrl = sp.get("q") ?? "";
    const [inputQ, setInputQ] = useState(qFromUrl);
    const isComposingRef = useRef(false);

    // URL → 입력창 동기화: 조합 중에는 덮어쓰지 않아 한글 마지막 글자가 보이도록 함
    useEffect(() => {
        if (!isComposingRef.current) {
            setInputQ(qFromUrl);
        }
    }, [qFromUrl]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<PostListItem[]>([]);

    const commitSearch = useCallback(
        (value: string) => {
            const next = new URLSearchParams(sp);
            if (value.trim()) next.set("q", value.trim());
            else next.delete("q");
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
                    categories: allowedApiCats,
                    q: qFromUrl.trim() || undefined,
                });
                if (cancelled) return;
                const list = (data.items ?? []).filter((it) =>
                    allowedApiCats.includes(it.category)
                );
                setItems(list);
            } catch (e) {
                if (cancelled) return;
                const msg =
                    e instanceof Error ? e.message : "목록을 불러오지 못했습니다.";
                setError(msg);
                setItems([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [allowedApiCats, qFromUrl]);

    const title = useMemo(() => {
        const found = NAV_ITEMS.find((i) => i.key === currentKey);
        return found ? found.label : "신입 교육 자료";
    }, [currentKey]);

    const onSearch = () => {
        commitSearch(inputQ);
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
        const value = target.value ?? "";
        setInputQ(value);
        isComposingRef.current = false;
        commitSearch(value);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            const v = (e.target as HTMLInputElement).value ?? inputQ;
            commitSearch(v);
            setInputQ(v);
        }
    };

    const listSearchParams = useMemo(() => {
        const p: Record<string, string> = {};
        if (catParam) p.cat = catParam;
        if (qFromUrl) p.q = qFromUrl;
        return p;
    }, [catParam, qFromUrl]);

    return (
        <div>
            <div className="header-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <div>
                    <div style={{ fontSize: 26, fontWeight: 900 }}>{title}</div>
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
                    + 새 글
                </Link>
            </div>

            <div
                style={{
                    marginTop: 14,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                }}
            >
                <input
                    value={inputQ}
                    onChange={(e) => setInputQ(e.target.value)}
                    onCompositionStart={onCompositionStart}
                    onCompositionEnd={onCompositionEnd}
                    onKeyDown={onKeyDown}
                    placeholder="검색어"
                    style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #444",
                        background: "#f5f5f5",
                        color: "#111",
                        outline: "none",
                    }}
                />
                <button
                    onClick={onSearch}
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
            </div>

            {loading && (
                <div style={{ marginTop: 14, opacity: 0.8 }}>불러오는 중...</div>
            )}
            {error && (
                <div style={{ marginTop: 14, color: "var(--app-error)", fontWeight: 700 }}>
                    {error}
                </div>
            )}

            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                {!loading && !error && items.length === 0 && (
                    <div style={{ opacity: 0.8, marginTop: 8 }}>게시글이 없습니다.</div>
                )}

                {items.map((post) => {
                    const detailSearch = new URLSearchParams(listSearchParams);
                    const detailUrl = `/posts/${post.id}?${detailSearch.toString()}`;

                    return (
                        <div
                            key={post.id}
                            className="content-card"
                            style={{
                                border: "1px solid #444",
                                borderRadius: 14,
                                background: "#fff",
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
                                    <Link
                                        to={detailUrl}
                                        style={{
                                            display: "inline-block",
                                            fontSize: 18,
                                            fontWeight: 900,
                                            color: "var(--app-text)",
                                            textDecoration: "none",
                                            lineHeight: 1.3,
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        {post.title}
                                    </Link>
                                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                                        {labelOfApiCategory(post.category)}
                                    </div>
                                </div>
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
