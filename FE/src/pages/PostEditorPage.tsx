import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, createSearchParams, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    createPost,
    createPostByUpload,
    fetchPost,
    fetchPostContent,
    patchPost,
    updateContentByUpload,
    uploadImage,
    ApiError,
} from "../lib/api";
import {
    type ApiCategory,
    API_CATEGORY_LABEL,
    isApiCategory,
} from "../lib/categories";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";

const API_CATEGORIES: ApiCategory[] = ["SYSTEM", "INCIDENT", "TRAINING"];

export default function PostEditorPage() {
    const { id } = useParams();
    const isEdit = !!id;
    const postId = Number(id);

    const [sp] = useSearchParams();
    const navigate = useNavigate();

    const catParam = sp.get("cat");
    const qParam = sp.get("q");

    const searchParams = useMemo(() => {
        const p: Record<string, string> = {};
        if (catParam) p.cat = catParam;
        if (qParam) p.q = qParam;
        return p;
    }, [catParam, qParam]);

    const [category, setCategory] = useState<ApiCategory>(
        isApiCategory(catParam) ? catParam : "TRAINING"
    );
    const [title, setTitle] = useState("");
    const [markdown, setMarkdown] = useState("");

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const editorRef = useRef<{ textarea?: HTMLTextAreaElement } | null>(null);

    const insertImageUrl = useCallback(
        (url: string, start?: number, end?: number) => {
            const imageMd = `\n![](${url})\n\n`;
            setMarkdown((prev) => {
                if (start !== undefined && start >= 0) {
                    const rangeEnd = end ?? start;
                    return prev.slice(0, start) + imageMd + prev.slice(rangeEnd);
                }
                const trimmed = prev.trim();
                const suffix = trimmed ? "\n\n" : "";
                return trimmed + suffix + imageMd;
            });
        },
        []
    );

    const backTo = useMemo(
        () =>
            isEdit
                ? `/posts/${id}?${createSearchParams(searchParams).toString()}`
                : `/posts?${createSearchParams(searchParams).toString()}`,
        [id, isEdit, searchParams]
    );

    useEffect(() => {
        if (!isEdit || !Number.isFinite(postId)) {
            if (!isEdit) setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        Promise.all([fetchPost(postId), fetchPostContent(postId).catch(() => null)])
            .then(([post, contentRes]) => {
                if (cancelled) return;
                setTitle(post.title);
                if (post.category) setCategory(post.category);
                setMarkdown(contentRes?.markdown ?? post.contentMd ?? "");
            })
            .catch((e) => {
                if (cancelled) return;
                const msg =
                    e instanceof ApiError
                        ? e.message
                        : e instanceof Error
                          ? e.message
                          : "게시글을 불러오지 못했습니다.";
                setError(msg);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [isEdit, postId]);

    const extractTitleFromMd = (md: string): string => {
        const s = md.trim();
        if (s.startsWith("#")) {
            const line = s.split("\n", 1)[0] ?? "";
            return line.replace(/^#+\s*/, "").trim() || "제목 없음";
        }
        return "제목 없음";
    };

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!file.name.toLowerCase().endsWith(".md")) {
                setError(".md 파일만 선택해 주세요.");
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const text = (reader.result as string) ?? "";
                setMarkdown(text);
                if (!isEdit) setTitle(extractTitleFromMd(text));
            };
            reader.readAsText(file, "UTF-8");
            setSelectedFile(file);
            setError(null);
            e.target.value = "";
        },
        [isEdit]
    );

    const handleCreateByUpload = useCallback(async () => {
        if (!selectedFile) {
            setError("먼저 .md 파일을 선택해 주세요.");
            return;
        }
        setUploading(true);
        setError(null);
        try {
            const created = await createPostByUpload(selectedFile, {
                title: title.trim() || undefined,
                category,
            });
            navigate(`/posts/${created.id}?${createSearchParams(searchParams).toString()}`);
        } catch (e) {
            const msg =
                e instanceof ApiError
                    ? e.message
                    : e instanceof Error
                      ? e.message
                      : "등록에 실패했습니다.";
            setError(msg);
        } finally {
            setUploading(false);
        }
    }, [selectedFile, title, category, searchParams, navigate]);

    const [imageUploading, setImageUploading] = useState(false);

    const handleEditorPaste = useCallback(
        async (e: React.ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith("image/")) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (!file) return;
                    const textarea = editorRef.current?.textarea;
                    const pos = textarea
                        ? textarea.selectionStart
                        : markdown.length;
                    const end = textarea
                        ? textarea.selectionEnd
                        : markdown.length;
                    setImageUploading(true);
                    try {
                        const { url } = await uploadImage(file);
                        insertImageUrl(url, pos, end);
                    } catch (err) {
                        const msg =
                            err instanceof ApiError
                                ? err.message
                                : err instanceof Error
                                  ? err.message
                                  : "이미지 업로드에 실패했습니다.";
                        setError(msg);
                    } finally {
                        setImageUploading(false);
                    }
                    return;
                }
            }
        },
        [insertImageUrl, markdown.length]
    );

    const handleReplaceContentByUpload = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file || !Number.isFinite(postId)) return;
            if (!file.name.toLowerCase().endsWith(".md")) {
                setError(".md 파일만 선택해 주세요.");
                return;
            }
            setUploading(true);
            setError(null);
            try {
                await updateContentByUpload(postId, file, {
                    title: title.trim() || undefined,
                });
                const contentRes = await fetchPostContent(postId);
                setMarkdown(contentRes.markdown ?? "");
            } catch (err) {
                const msg =
                    err instanceof ApiError
                        ? err.message
                        : err instanceof Error
                          ? err.message
                          : "본문 교체에 실패했습니다.";
                setError(msg);
            } finally {
                setUploading(false);
            }
            e.target.value = "";
        },
        [postId, title]
    );

    const handleSave = useCallback(async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            setError("제목을 입력해 주세요.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            if (isEdit) {
                await patchPost(postId, {
                    title: trimmedTitle,
                    category,
                    markdown: markdown || undefined,
                });
                navigate(`/posts/${postId}?${createSearchParams(searchParams).toString()}`);
            } else {
                const created = await createPost({
                    title: trimmedTitle,
                    category,
                    contentMd: markdown.trim() || "\n",
                });
                navigate(`/posts/${created.id}?${createSearchParams(searchParams).toString()}`);
            }
        } catch (e) {
            const msg =
                e instanceof ApiError
                    ? e.message
                    : e instanceof Error
                      ? e.message
                      : "저장에 실패했습니다.";
            setError(msg);
        } finally {
            setSaving(false);
        }
    }, [isEdit, postId, title, markdown, category, searchParams, navigate]);

    if (loading) {
        return (
            <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>불러오는 중...</div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "100%", minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>
                        {isEdit ? "게시글 수정" : "게시글 등록"}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                        {isEdit ? (
                            <>
                                id=<b>{id}</b>
                            </>
                        ) : (
                            <>카테고리를 선택한 뒤 제목·본문을 입력하세요.</>
                        )}
                    </div>
                </div>

                <div className="header-actions" style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || uploading}
                        style={{
                            width: 90,
                            minHeight: 42,
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid #444",
                            background: "#2563eb",
                            color: "#fff",
                            fontWeight: 800,
                            cursor: saving || uploading ? "not-allowed" : "pointer",
                            opacity: saving || uploading ? 0.7 : 1,
                            boxSizing: "border-box",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {saving ? "저장 중..." : "저장"}
                    </button>
                    <Link
                        to={backTo}
                        style={{
                            width: 90,
                            minHeight: 42,
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid #444",
                            textDecoration: "none",
                            color: "#111",
                            background: "#fff",
                            fontWeight: 800,
                            boxSizing: "border-box",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        취소
                    </Link>
                </div>
            </div>

            {error && (
                <div style={{ marginTop: 12, color: "var(--app-error)", fontWeight: 700 }}>{error}</div>
            )}

            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                <div>
                    <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                        카테고리
                    </label>
                    <select
                        value={category}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (isApiCategory(v)) setCategory(v);
                        }}
                        style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid #444",
                            background: "#f5f5f5",
                            color: "#111",
                            minWidth: 200,
                            outline: "none",
                        }}
                    >
                        {API_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                                {API_CATEGORY_LABEL[c]}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                        제목
                    </label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="제목"
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid #444",
                            background: "#f5f5f5",
                            color: "#111",
                            outline: "none",
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                        본문 (Markdown · WYSIWYG) · 이미지: Ctrl+V 붙여넣기 시 서버 업로드 후 URL만 저장
                        {imageUploading && (
                            <span style={{ marginLeft: 8, color: "var(--app-link)" }}>업로드 중...</span>
                        )}
                    </label>
                    <div data-color-mode="light" onPaste={handleEditorPaste}>
                        <MDEditor
                            ref={editorRef}
                            value={markdown}
                            onChange={(val) => setMarkdown(val ?? "")}
                            height={520}
                            minHeight={360}
                            maxHeight={900}
                            preview="live"
                            visibleDragbar={true}
                        />
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {!isEdit && (
                        <>
                            <label
                                className="file-action-label"
                                style={{
                                    padding: "10px 12px",
                                    borderRadius: 10,
                                    border: "1px solid #444",
                                    background: "#f5f5f5",
                                    color: "#111",
                                    fontWeight: 800,
                                    cursor: "pointer",
                                    display: "inline-block",
                                }}
                            >
                                .md 파일 선택
                                <input
                                    type="file"
                                    accept=".md"
                                    onChange={handleFileSelect}
                                    style={{ display: "none" }}
                                />
                            </label>
                            {selectedFile && (
                                <button
                                    type="button"
                                    onClick={handleCreateByUpload}
                                    disabled={uploading}
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        border: "1px solid #444",
                                        background: "#2563eb",
                                        color: "#fff",
                                        fontWeight: 800,
                                        cursor: uploading ? "not-allowed" : "pointer",
                                    }}
                                >
                                    {uploading ? "등록 중..." : "이 파일로 등록"}
                                </button>
                            )}
                        </>
                    )}
                    {isEdit && (
                        <label
                            className="file-action-label"
                            style={{
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: "1px solid #444",
                                background: "#f5f5f5",
                                color: "#111",
                                fontWeight: 800,
                                cursor: uploading ? "not-allowed" : "pointer",
                                display: "inline-block",
                            }}
                        >
                            {uploading ? "교체 중..." : "본문을 .md 파일로 교체"}
                            <input
                                type="file"
                                accept=".md"
                                onChange={handleReplaceContentByUpload}
                                style={{ display: "none" }}
                                disabled={uploading}
                            />
                        </label>
                    )}
                </div>
            </div>
        </div>
    );
}
