import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, createSearchParams, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    createPost,
    createPostByUpload,
    fetchCategories,
    fetchPost,
    fetchPostContent,
    patchPost,
    updateContentByUpload,
    uploadImage,
    ApiError,
    type CategoryItem,
} from "../lib/api";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";

/** 게시글 작성/수정 시 선택 가능한 카테고리 = 전체 하위 카테고리 (depth !== 0) + 공지사항 카테고리. TEST_child* 등 모두 포함 */
function useEditableCategories(): CategoryItem[] {
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    useEffect(() => {
        fetchCategories()
            .then((list) => setCategories(list ?? []))
            .catch(() => setCategories([]));
    }, []);
    return useMemo(() => {
        const noticeCategory = categories.find(c => c.label === "공지사항" || c.code === "CAT_NOTICE");
        const subCategories = categories.filter((c) => c.depth !== 0);
        // 공지사항 카테고리가 있으면 맨 앞에 추가
        if (noticeCategory) {
            return [noticeCategory, ...subCategories];
        }
        return subCategories;
    }, [categories]);
}

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

    const editableCategories = useEditableCategories();
    /** 드롭다운 선택용. ID로 두어 모든 하위 카테고리를 개별 선택 가능하게 함 */
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [isNotice, setIsNotice] = useState<boolean>(false);
    
    // 공지사항 카테고리 찾기 (editableCategories에 이미 포함되어 있음)
    const noticeCategory = useMemo(() => {
        return editableCategories.find(c => c.label === "공지사항" || c.code === "CAT_NOTICE");
    }, [editableCategories]);

    // 신규 작성 시 카테고리 자동 선택 제거 - 사용자가 반드시 선택하도록 함

    const [title, setTitle] = useState("");
    const [markdown, setMarkdown] = useState("");

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);

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
                setIsNotice(post.isNotice === true);
                // categoryId 사용
                if (post.categoryId != null) {
                    // editableCategories에서 찾기 (공지사항 포함)
                    const found = editableCategories.find((c) => c.id === post.categoryId);
                    if (found) {
                        setSelectedCategoryId(post.categoryId);
                    }
                }
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
    }, [isEdit, postId, editableCategories]);

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

    const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        setSelectedImages(imageFiles);
        e.target.value = "";
    }, []);

    const handleCreateByUpload = useCallback(async () => {
        if (!selectedFile) {
            setError("먼저 .md 파일을 선택해 주세요.");
            return;
        }
        
        // categoryId는 필수
        if (!selectedCategoryId || selectedCategoryId <= 0) {
            setError("카테고리를 선택해 주세요.");
            return;
        }
        
        setUploading(true);
        setError(null);
        try {
            const created = await createPostByUpload(selectedFile, {
                title: title.trim() || undefined,
                categoryId: selectedCategoryId,
                isNotice: isNotice,
                images: selectedImages.length > 0 ? selectedImages : undefined,
                attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined,
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
    }, [selectedFile, title, selectedCategoryId, isNotice, selectedImages, searchParams, navigate]);

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
                    images: selectedImages.length > 0 ? selectedImages : undefined,
                    attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined,
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
        [postId, title, selectedImages, selectedAttachments]
    );

    const handleSave = useCallback(async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            setError("제목을 입력해 주세요.");
            return;
        }
        
        // categoryId는 필수
        if (!selectedCategoryId || selectedCategoryId <= 0) {
            setError("카테고리를 선택해 주세요.");
            return;
        }
        
        setSaving(true);
        setError(null);
        try {
            if (isEdit) {
                await patchPost(postId, {
                    title: trimmedTitle,
                    categoryId: selectedCategoryId,
                    markdown: markdown || undefined,
                    isNotice: isNotice,
                    attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined,
                });
                navigate(`/posts/${postId}?${createSearchParams(searchParams).toString()}`);
            } else {
                const created = await createPost({
                    title: trimmedTitle,
                    categoryId: selectedCategoryId,
                    contentMd: markdown.trim() || "\n",
                    isNotice: isNotice,
                    attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined,
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
    }, [isEdit, postId, title, markdown, selectedCategoryId, isNotice, selectedAttachments, searchParams, navigate]);

    if (loading) {
        return (
            <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>불러오는 중...</div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "100%", minWidth: 0, boxSizing: "border-box" }}>
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

            <div style={{ marginTop: 16, display: "grid", gap: 10, maxWidth: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                            카테고리
                        </label>
                        <select
                            value={isNotice && noticeCategory ? noticeCategory.id : (selectedCategoryId ?? "")}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v !== "") {
                                    const id = Number(v);
                                    if (!isNaN(id) && id > 0) {
                                        console.log("[PostEditor] Category selected:", id, editableCategories.find(c => c.id === id));
                                        setSelectedCategoryId(id);
                                        // 카테고리 변경 시 공지사항 체크박스 해제 (공지사항 카테고리가 아닌 경우)
                                        if (noticeCategory && id !== noticeCategory.id) {
                                            setIsNotice(false);
                                        } else if (noticeCategory && id === noticeCategory.id) {
                                            // 공지사항 카테고리 선택 시 체크박스도 체크
                                            setIsNotice(true);
                                        }
                                    } else {
                                        console.warn("[PostEditor] Invalid category ID:", v);
                                    }
                                } else {
                                    // 빈 값 선택 시 카테고리 초기화
                                    setSelectedCategoryId(null);
                                    setIsNotice(false);
                                }
                            }}
                            disabled={isNotice}
                            style={{
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: "1px solid #444",
                                background: isNotice ? "#e5e5e5" : "#f5f5f5",
                                color: isNotice ? "#888" : (selectedCategoryId ? "#111" : "#999"),
                                minWidth: 200,
                                outline: "none",
                                cursor: isNotice ? "not-allowed" : "pointer",
                            }}
                        >
                            <option value="">카테고리를 선택하세요</option>
                            {editableCategories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.8, marginBottom: 4, whiteSpace: "nowrap" }}>
                            <input
                                type="checkbox"
                                checked={isNotice}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setIsNotice(checked);
                                    if (checked && noticeCategory?.id) {
                                        // 공지사항 체크박스 선택 시 공지사항 카테고리로 설정
                                        setSelectedCategoryId(noticeCategory.id);
                                    }
                                }}
                                style={{
                                    width: 18,
                                    height: 18,
                                    cursor: "pointer",
                                }}
                            />
                            <span>공지사항</span>
                        </label>
                    </div>
                </div>

                <div style={{ maxWidth: "100%", boxSizing: "border-box" }}>
                    <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                        제목
                    </label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="제목"
                        style={{
                            width: "100%",
                            maxWidth: "100%",
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid #444",
                            background: "#f5f5f5",
                            color: "#111",
                            outline: "none",
                            boxSizing: "border-box",
                        }}
                    />
                </div>

                <div style={{ maxWidth: "100%", boxSizing: "border-box" }}>
                    <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                        첨부파일
                    </label>
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const files = Array.from(e.dataTransfer.files);
                            setSelectedAttachments((prev) => [...prev, ...files]);
                        }}
                        style={{
                            width: "100%",
                            maxWidth: "100%",
                            minHeight: 120,
                            padding: "20px",
                            borderRadius: 10,
                            border: `2px dashed ${isDragging ? "#2563eb" : "#444"}`,
                            background: isDragging ? "#e3f2fd" : "#fafafa",
                            color: "#111",
                            textAlign: "center",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            boxSizing: "border-box",
                        }}
                        onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.multiple = true;
                            input.onchange = (e) => {
                                const files = Array.from((e.target as HTMLInputElement).files || []);
                                setSelectedAttachments((prev) => [...prev, ...files]);
                            };
                            input.click();
                        }}
                    >
                        {selectedAttachments.length === 0 ? (
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                                    파일을 드래그하여 놓거나 클릭하여 선택하세요
                                </div>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>
                                    여러 파일을 선택할 수 있습니다
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: "left" }}>
                                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                                    {selectedAttachments.length}개 파일 선택됨
                                </div>
                                {selectedAttachments.map((file, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "8px 12px",
                                            marginBottom: 4,
                                            background: "#fff",
                                            borderRadius: 6,
                                            border: "1px solid #ddd",
                                        }}
                                    >
                                        <span style={{ fontSize: 13 }}>{file.name}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedAttachments((prev) => prev.filter((_, i) => i !== idx));
                                            }}
                                            style={{
                                                padding: "4px 8px",
                                                borderRadius: 4,
                                                border: "1px solid #ddd",
                                                background: "#fff",
                                                cursor: "pointer",
                                                fontSize: 12,
                                            }}
                                        >
                                            삭제
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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
                                이미지 파일 선택 (선택사항)
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageSelect}
                                    style={{ display: "none" }}
                                />
                            </label>
                            {selectedImages.length > 0 && (
                                <span style={{ fontSize: 12, opacity: 0.7 }}>
                                    {selectedImages.length}개 이미지 선택됨
                                </span>
                            )}
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
                                이미지 파일 선택 (선택사항)
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageSelect}
                                    style={{ display: "none" }}
                                    disabled={uploading}
                                />
                            </label>
                            {selectedImages.length > 0 && (
                                <span style={{ fontSize: 12, opacity: 0.7 }}>
                                    {selectedImages.length}개 이미지 선택됨
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
