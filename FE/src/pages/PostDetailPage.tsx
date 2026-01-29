import { Link, createSearchParams, useLocation, useParams, useSearchParams } from "react-router-dom";
import { DEFAULT_CATEGORY, isCategoryKey } from "../lib/categories";

export default function PostDetailPage() {
    const { id } = useParams();
    const [sp] = useSearchParams();
    const location = useLocation();

    const categoryParam = sp.get("category");
    const category = isCategoryKey(categoryParam) ? categoryParam : DEFAULT_CATEGORY;

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>게시글 상세</div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                        id=<b>{id}</b> / category=<b>{category}</b>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <Link
                        to={`/posts/${id}/edit${location.search}`}
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
                        수정
                    </Link>
                    <Link
                        to={`/posts${location.search}`}
                        style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid #2a2a2a",
                            textDecoration: "none",
                            color: "#eaeaea",
                        }}
                    >
                        목록
                    </Link>
                </div>
            </div>

            <div style={{ marginTop: 16, padding: 14, borderRadius: 12, border: "1px solid #2a2a2a", background: "#121212" }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>테스트 글 제목(임시)</div>
                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>createdAt / updatedAt 영역(추후)</div>

                <div style={{ marginTop: 14, borderTop: "1px solid #2a2a2a", paddingTop: 12, lineHeight: 1.6 }}>
                    여기는 markdown 본문이 렌더링될 영역이야. (다음 단계에서 /api/posts/{`{id}`}/content 붙임)
                </div>
            </div>
        </div>
    );
}
