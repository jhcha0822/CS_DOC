import { useEffect, useState } from "react";
import { Link, createSearchParams, useParams, useSearchParams } from "react-router-dom";
import { fetchPost, type PostDetail } from "../lib/api";
import { DEFAULT_CATEGORY, isCategoryKey, labelOfApiCategory } from "../lib/categories";

function formatKST(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
}

export default function PostDetailPage() {
    const { id } = useParams();
    const [sp] = useSearchParams();

    const categoryParam = sp.get("category");
    const categoryKey = isCategoryKey(categoryParam) ? categoryParam : DEFAULT_CATEGORY;

    const postId = Number(id);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [post, setPost] = useState<PostDetail | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!Number.isFinite(postId)) {
                setError("잘못된 게시글 ID 입니다.");
                setPost(null);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const data = await fetchPost(postId);
                if (cancelled) return;
                setPost(data);
            } catch (e: any) {
                if (cancelled) return;
                setError(e?.message || "Failed to fetch post");
                setPost(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [postId]);

    const listUrl = `/posts?${createSearchParams({ category: categoryKey }).toString()}`;
    const editUrl = `/posts/${postId}/edit?${createSearchParams({ category: categoryKey }).toString()}`;

    return (
        <div>
            {/* 헤더 */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                }}
            >
                <div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>게시글 상세</div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                        id=<b>{id}</b>
                    </div>
                </div>

                {/* 버튼: 깨지지 않게 wrap 허용 */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link
                        to={editUrl}
                        style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid #2a2a2a",
                            textDecoration: "none",
                            color: "#eaeaea",
                            background: "#1e1e1e",
                            fontWeight: 800,
                        }}
                    >
                        수정
                    </Link>
                    <Link
                        to={listUrl}
                        style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid #2a2a2a",
                            textDecoration: "none",
                            color: "#eaeaea",
                            fontWeight: 800,
                        }}
                    >
                        목록
                    </Link>
                </div>
            </div>

            {/* 바디 */}
            <div
                style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 12,
                    border: "1px solid #2a2a2a",
                    background: "#121212",
                    minHeight: 120,
                }}
            >
                {loading && <div style={{ opacity: 0.8 }}>불러오는 중...</div>}

                {error && (
                    <div>
                        <div style={{ color: "#ff6b6b", fontWeight: 800 }}>{error}</div>
                        <div style={{ marginTop: 10, opacity: 0.8 }}>
                            <Link to={listUrl} style={{ color: "#7aa7ff" }}>
                                목록으로 돌아가기 →
                            </Link>
                        </div>
                    </div>
                )}

                {!loading && !error && post && (
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 18 }}>{post.title}</div>
                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                            {labelOfApiCategory(post.category)} · 수정 {formatKST(post.updatedAt)}
                        </div>

                        {/* ✅ 본문(글 내용) 영역은 요구사항대로 아예 표시하지 않음 */}
                    </div>
                )}
            </div>
        </div>
    );
}
