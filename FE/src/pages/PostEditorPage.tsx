import { useMemo, useState } from "react";
import { Link, createSearchParams, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DEFAULT_CATEGORY, isCategoryKey } from "../lib/categories";

export default function PostEditorPage() {
    const { id } = useParams();
    const isEdit = !!id;

    const [sp] = useSearchParams();
    const navigate = useNavigate();

    const categoryParam = sp.get("category");
    const category = isCategoryKey(categoryParam) ? categoryParam : DEFAULT_CATEGORY;

    const [title, setTitle] = useState(isEdit ? `테스트 글 #${id}` : "");
    const [markdown, setMarkdown] = useState(isEdit ? `# 제목\n\n여기에 본문(마크다운)` : "");

    const backTo = useMemo(
        () => (isEdit ? `/posts/${id}?${createSearchParams({ category }).toString()}` : `/posts?${createSearchParams({ category }).toString()}`),
        [category, id, isEdit]
    );

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{isEdit ? "게시글 수정" : "게시글 등록"}</div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                        category=<b>{category}</b>
                        {isEdit ? (
                            <>
                                {" "}
                                / id=<b>{id}</b>
                            </>
                        ) : null}
                    </div>
                </div>

                <Link
                    to={backTo}
                    style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        textDecoration: "none",
                        color: "#eaeaea",
                    }}
                >
                    취소
                </Link>
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목"
                    style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        background: "#121212",
                        color: "#eaeaea",
                    }}
                />

                <textarea
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    placeholder="본문(markdown)"
                    rows={16}
                    style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        background: "#121212",
                        color: "#eaeaea",
                        resize: "vertical",
                        lineHeight: 1.5,
                    }}
                />

                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        onClick={() => {
                            // 다음 단계에서: POST/PATCH 붙일 예정
                            if (isEdit) navigate(`/posts/${id}?${createSearchParams({ category }).toString()}`);
                            else navigate(`/posts?${createSearchParams({ category }).toString()}`);
                        }}
                        style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid #2a2a2a",
                            background: "#1e1e1e",
                            color: "#eaeaea",
                            fontWeight: 800,
                        }}
                    >
                        저장(임시)
                    </button>
                    <div style={{ fontSize: 12, opacity: 0.7, alignSelf: "center" }}>
                        title/markdown 상태는 잡았고, 다음 단계에서 BE API 연결함
                    </div>
                </div>
            </div>
        </div>
    );
}
