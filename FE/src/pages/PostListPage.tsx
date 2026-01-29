import { useEffect, useRef, useState } from "react";
import { createSearchParams, Link, useSearchParams } from "react-router-dom";
import {
    DEFAULT_CATEGORY,
    isCategoryKey,
    labelOf,
    toFilterKeys,
    toApiCategories,
    type CategoryKey,
} from "../lib/categories";

export default function PostListPage() {
    const [sp, setSp] = useSearchParams();

    const category: CategoryKey = (() => {
        const v = sp.get("category");
        return isCategoryKey(v) ? v : DEFAULT_CATEGORY;
    })();

    // URL의 q는 "현재 검색 확정값"
    const qFromUrl = sp.get("q") ?? "";

    // input은 로컬 state(IME 안전)
    const [q, setQ] = useState<string>(qFromUrl);

    // 뒤로가기/사이드바 이동 등으로 URL이 바뀌면 input도 동기화
    useEffect(() => {
        setQ(qFromUrl);
    }, [qFromUrl]);

    // IME 조합중인지 플래그
    const composingRef = useRef(false);

    const filterKeys = toFilterKeys(category);
    const apiCategories = toApiCategories(category);

    // ✅ "검색 확정" 함수: 버튼/Enter에서만 호출
    const commitSearch = () => {
        const next = new URLSearchParams(sp);

        // category는 항상 유지(안전)
        next.set("category", category);

        const trimmed = q.trim();
        if (trimmed) next.set("q", trimmed);
        else next.delete("q");

        // (선택) 검색 확정 시 페이지 리셋이 필요하면:
        // next.delete("page");

        setSp(next, { replace: true });
    };

    const clearSearch = () => {
        setQ("");
        const next = new URLSearchParams(sp);
        next.set("category", category);
        next.delete("q");
        // next.delete("page");
        setSp(next, { replace: true });
    };

    // ✅ 상세로 갈 때 "현재 목록 상태(querystring)" 그대로 전달
    //    (category/q/page 등 포함)
    const listQueryString = sp.toString(); // e.g. "category=system&q=테스"

    return (
        <div>
            <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between" }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{labelOf(category)}</div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                        category=<b>{category}</b> / filterKeys=<b>{filterKeys.join(", ")}</b> / apiCategories=
                        <b>{apiCategories.join(", ")}</b>
                        {qFromUrl ? (
                            <>
                                {" "}
                                / q=<b>{qFromUrl}</b>
                            </>
                        ) : null}
                    </div>
                </div>

                <Link
                    // 새 글 작성 후 목록 복귀도 고려하면 category만 유지(원하면 q도 유지 가능)
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

            {/* ✅ Enter로 검색되게 하려면 form(onSubmit) 쓰는 게 제일 깔끔 */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (composingRef.current) return; // IME 조합 중 Enter는 무시
                    commitSearch();
                }}
                style={{ marginTop: 16, display: "flex", gap: 8 }}
            >
                <input
                    value={q}
                    onCompositionStart={() => {
                        composingRef.current = true;
                    }}
                    onCompositionEnd={() => {
                        // 조합 종료
                        composingRef.current = false;
                    }}
                    onChange={(e) => {
                        setQ(e.target.value);
                    }}
                    placeholder="검색어"
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
                    type="submit"
                    style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        background: "#1e1e1e",
                        color: "#eaeaea",
                        fontWeight: 800,
                        cursor: "pointer",
                    }}
                >
                    검색
                </button>

                <button
                    type="button"
                    onClick={clearSearch}
                    style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        background: "transparent",
                        color: "#eaeaea",
                        cursor: "pointer",
                    }}
                >
                    초기화
                </button>
            </form>

            <div style={{ marginTop: 18, borderTop: "1px solid #2a2a2a", paddingTop: 14 }}>
                <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 8 }}>
                    (다음 단계에서 BE /api/posts 연결: categories={apiCategories.join(",")})
                </div>

                {/* 임시 더미 */}
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
                                newbie 클릭 시 하위(실습/장애/업무시스템) 전체가 포함되는 구조
                            </div>
                            <div style={{ marginTop: 10 }}>
                                <Link
                                    // ✅ 여기서 기존 category/q 유지가 핵심!
                                    to={`/posts/${id}?${listQueryString}`}
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
