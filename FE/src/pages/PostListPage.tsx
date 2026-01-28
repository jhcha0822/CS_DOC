import { createSearchParams, Link, useSearchParams } from "react-router-dom";
import { DEFAULT_CATEGORY, isCategoryKey, labelOf, toFilterKeys, type CategoryKey } from "../lib/categories";

export default function PostListPage() {
    const [sp, setSp] = useSearchParams();

    const category: CategoryKey = (() => {
        const v = sp.get("category");
        return isCategoryKey(v) ? v : DEFAULT_CATEGORY;
    })();

    const q = sp.get("q") ?? "";

    // ✅ 상위(newbie)이면 하위 전체 키가 들어옴
    const filterKeys = toFilterKeys(category);

    return (
        <div>
            <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between" }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{labelOf(category)}</div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                        category=<b>{category}</b> / filterKeys=<b>{filterKeys.join(", ")}</b>
                        {q ? (
                            <>
                                {" "}
                                / q=<b>{q}</b>
                            </>
                        ) : null}
                    </div>
                </div>

                <Link
                    to={`/posts/new?${createSearchParams({ category }).toString()}`}
                    style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        textDecoration: "none",
                        color: "#eaeaea",
                        background: "#1e1e1e",
                        fontWeight: 700,
                    }}
                >
                    + 새 글
                </Link>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <input
                    value={q}
                    onChange={(e) => {
                        const next = new URLSearchParams(sp);
                        const nextQ = e.target.value;
                        if (nextQ) next.set("q", nextQ);
                        else next.delete("q");
                        setSp(next, { replace: true });
                    }}
                    placeholder="검색어 (임시)"
                    style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        background: "#121212",
                        color: "#eaeaea",
                    }}
                />
                <button
                    onClick={() => {
                        setSp(createSearchParams({ category }), { replace: true });
                    }}
                    style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        background: "transparent",
                        color: "#eaeaea",
                    }}
                >
                    초기화
                </button>
            </div>

            <div style={{ marginTop: 18, borderTop: "1px solid #2a2a2a", paddingTop: 14 }}>
                <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 8 }}>
                    (다음 단계에서 BE /api/posts 붙여서 목록 띄울 거야)
                </div>

                {/* 임시 더미: 나중엔 여기서 filterKeys 기반으로 BE 호출/필터 */}
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
                    {[1, 2, 3].map((id) => (
                        <li
                            key={id}
                            style={{
                                padding: 14,
                                border: "1px solid #2a2a2a",
                                borderRadius: 12,
                                background: "#121212",
                            }}
                        >
                            <div style={{ fontWeight: 800 }}>테스트 글 #{id}</div>
                            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                                현재 선택된 filterKeys 기준으로 “목록 전체”를 보여주는 구조
                            </div>
                            <div style={{ marginTop: 10 }}>
                                <Link
                                    to={`/posts/${id}?${createSearchParams({ category }).toString()}`}
                                    style={{ color: "#9bdcff", textDecoration: "none", fontWeight: 700 }}
                                >
                                    상세 보기 →
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
