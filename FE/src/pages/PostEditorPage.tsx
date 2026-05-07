import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, createSearchParams, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    createPost,
    createPostByUpload,
    fetchCategories,
    fetchPost,
    fetchPostContent,
    parseLinkedPostAttachments,
    patchPost,
    removePostAttachmentLink,
    updateContentByUpload,
    uploadImage,
    ApiError,
    type AssignmentTaskItemInput,
    type CategoryItem,
    type LinkedPostAttachment,
} from "../lib/api";
import { getCurrentUser } from "../lib/auth";
import ErrorModal from "../components/ErrorModal";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";

/** 게시글 작성/수정 시 사용할 전체 카테고리. 드롭다운 그룹화용으로 전체 목록 필요. 왼쪽 사이드바와 동일한 순서로 정렬 */
function useEditableCategories(): CategoryItem[] {
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    useEffect(() => {
        fetchCategories()
            .then((list) => setCategories(list ?? []))
            .catch(() => setCategories([]));
    }, []);
    return useMemo(() => {
        const sorted = [...categories].sort((a, b) => {
            if (a.depth !== b.depth) return a.depth - b.depth;
            if (a.depth === 0) return a.sortOrder - b.sortOrder;
            if (a.parentId !== b.parentId) {
                const aParent = categories.find((c) => c.id === a.parentId);
                const bParent = categories.find((c) => c.id === b.parentId);
                if (aParent && bParent) {
                    const o = aParent.sortOrder - bParent.sortOrder;
                    if (o !== 0) return o;
                }
                return (a.parentId ?? 0) - (b.parentId ?? 0);
            }
            return a.sortOrder - b.sortOrder;
        });
        return sorted;
    }, [categories]);
}

/** 드롭다운 렌더링용: 상위(라벨, 비선택) + 들여쓰기된 하위(선택 가능). 예: "신입 교육 자료" / "    업무시스템" */
type CategoryOptionItem =
    | { type: 'label'; label: string }
    | { type: 'category'; category: CategoryItem; indent: boolean };

const isNoticeCategory = (c: CategoryItem) => c.label === "공지사항" || c.code === "CAT_NOTICE";

function useCategoryOptionsForDropdown(categories: CategoryItem[]): CategoryOptionItem[] {
    return useMemo(() => {
        const result: CategoryOptionItem[] = [];
        const topLevel = categories.filter((c) => c.depth === 0).sort((a, b) => a.sortOrder - b.sortOrder);
        const getChildren = (parentId: number) =>
            categories.filter((c) => c.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);

        for (const parent of topLevel) {
            const children = getChildren(parent.id);
            if (!isNoticeCategory(parent)) {
                result.push({ type: 'label', label: parent.label });
            }
            if (isNoticeCategory(parent)) {
                result.push({ type: 'category', category: parent, indent: false });
            }
            for (const child of children) {
                result.push({ type: 'category', category: child, indent: true });
            }
        }
        return result;
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

    const allCategories = useEditableCategories();
    /** 관리자는 전체 카테고리. 비관리자는 신규 작성 시 adminOnly 카테고리를 드롭다운에서 제외 */
    const visibleCategories = useMemo(() => {
        const user = getCurrentUser();
        if (user?.role === "ADMIN") return allCategories;
        if (isEdit) return allCategories;
        return allCategories.filter((c) => !c.adminOnly);
    }, [allCategories, isEdit]);
    const categoryOptions = useCategoryOptionsForDropdown(visibleCategories);
    /** 선택 가능한 카테고리 = 공지사항 + 모든 하위(depth 1). ID 매칭용 (실습은 관리자만 표시) */
    const editableCategories = useMemo(() => {
        const notice = visibleCategories.find((c) => c.label === "공지사항" || c.code === "CAT_NOTICE");
        const subs = visibleCategories.filter((c) => c.depth !== 0);
        return notice ? [notice, ...subs] : subs;
    }, [visibleCategories]);
    /** 드롭다운 선택용. ID로 두어 모든 하위 카테고리를 개별 선택 가능하게 함 */
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [isNotice, setIsNotice] = useState<boolean>(false);

    /** 선택한 카테고리 (실습이면 과제로 생성) */
    const selectedCategory = useMemo(
        () => (selectedCategoryId != null ? editableCategories.find((c) => c.id === selectedCategoryId) ?? null : null),
        [selectedCategoryId, editableCategories]
    );
    const isAssignmentCategory = selectedCategory?.code === "CAT_TRAINING";

    /** 수정 시 로드된 글이 과제(ASSIGNMENT)인지. 과제 전용 폼 표시 여부에 사용 */
    const [postKindFromPost, setPostKindFromPost] = useState<"DOC" | "ASSIGNMENT" | null>(null);
    /** 과제 총 배점 (세부 실습 배점 합 = 100) */
    const [maxScore, setMaxScore] = useState<number>(100);
    /** 세부 실습 목록 (내용 MD + 배점, 합 = 100) */
    const [assignmentTasks, setAssignmentTasks] = useState<AssignmentTaskItemInput[]>([]);

    /** 과제 전용 등록/수정 폼 표시 여부 */
    const isAssignmentForm = (!isEdit && isAssignmentCategory) || (isEdit && postKindFromPost === "ASSIGNMENT");

    // 공지사항 카테고리 찾기 (editableCategories에 이미 포함되어 있음)
    const noticeCategory = useMemo(() => {
        return editableCategories.find(c => c.label === "공지사항" || c.code === "CAT_NOTICE");
    }, [editableCategories]);

    // 신규 작성 시 URL의 cat 파라미터로 카테고리 자동 선택. editableCategories에 있는 것만 적용(비관리자일 때 adminOnly 제외됨)
    const hasAppliedCatParam = useRef(false);
    useEffect(() => {
        if (!isEdit && catParam && editableCategories.length > 0 && !hasAppliedCatParam.current) {
            const catId = parseInt(catParam, 10);
            if (!Number.isNaN(catId) && editableCategories.some((c) => c.id === catId)) {
                setSelectedCategoryId(catId);
                hasAppliedCatParam.current = true;
            }
        }
    }, [isEdit, catParam, editableCategories]);

    useEffect(() => {
        if (!isEdit) {
            setLinkedAttachments([]);
        }
    }, [isEdit]);

    const [title, setTitle] = useState("");
    const [summaryTitle, setSummaryTitle] = useState<string>("");
    const [markdown, setMarkdown] = useState("");

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
    /** 수정 모드: 서버에 이미 연결된 첨부 (링크 제거 API로만 삭제) */
    const [linkedAttachments, setLinkedAttachments] = useState<LinkedPostAttachment[]>([]);
    const [removingAttachmentUrl, setRemovingAttachmentUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const editorRef = useRef<{ textarea?: HTMLTextAreaElement } | null>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const pendingReplaceRef = useRef<{ runUpdate: (images: File[]) => Promise<void> } | null>(null);
    const [showLocalImageModal, setShowLocalImageModal] = useState(false);
    /** 확인 클릭 시 같은 클릭 핸들러에서 실행할 콜백(파일 input 열기). 브라우저 제스처 제한 회피용 */
    const pendingLocalImageOpenRef = useRef<(() => void) | null>(null);

    const insertImageUrl = useCallback(
        (url: string, start?: number, end?: number) => {
            const imageMd = `![](${url})`;
            setMarkdown((prev) => {
                if (start !== undefined && start >= 0) {
                    const rangeEnd = end ?? start;
                    return prev.slice(0, start) + imageMd + prev.slice(rangeEnd);
                }
                const trimmed = prev.trim();
                const suffix = trimmed ? "\n" : "";
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
        setPostKindFromPost(null);
        setLinkedAttachments([]);
        fetchPost(postId)
            .then((post) => {
                if (cancelled) return;
                setTitle(post.title);
                setSummaryTitle(post.summaryTitle ?? "");
                setIsNotice(post.isNotice === true);
                if (post.categoryId != null) {
                    const found = editableCategories.find((c) => c.id === post.categoryId);
                    if (found) setSelectedCategoryId(post.categoryId);
                }
                setPostKindFromPost(post.postKind === "ASSIGNMENT" || post.postKind === "DOC" ? post.postKind : null);
                if (post.postKind === "ASSIGNMENT") {
                    setMaxScore(post.maxScore ?? 100);
                    const tasks = post.assignmentTasks ?? [];
                    setAssignmentTasks(
                        tasks.map((t, i) => ({
                            taskId: t.taskId,
                            title: t.title || `세부 실습 ${i + 1}`,
                            descriptionMarkdown: t.descriptionMarkdown ?? "",
                            sortOrder: i,
                            maxScore: t.maxScore ?? 0,
                            difficulty: t.difficulty ?? "MEDIUM",
                        }))
                    );
                }
                setLinkedAttachments(parseLinkedPostAttachments(post.attachments));
                return fetchPostContent(postId).then((contentRes) => {
                    if (cancelled) return;
                    setMarkdown(contentRes?.markdown ?? post.contentMd ?? "");
                }).catch(() => {
                    if (!cancelled) setMarkdown(post.contentMd ?? "");
                });
            })
            .catch((e) => {
                if (cancelled) return;
                const msg =
                    e instanceof ApiError ? e.message : e instanceof Error ? e.message : "게시글을 불러오지 못했습니다.";
                setError(msg);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [isEdit, postId, editableCategories]);


    const extractTitleFromMd = (md: string): string => {
        const s = md.trim();
        if (s.startsWith("#")) {
            const line = s.split("\n", 1)[0] ?? "";
            return line.replace(/^#+\s*/, "").trim() || "제목 없음";
        }
        return "제목 없음";
    };

    /** md 본문에 로컬 PC 이미지 경로가 있는지 검사 (file://, C:\, ./, ../ 등) */
    const hasLocalImageInMd = (text: string): boolean => {
        const imgRegex = /!\[.*?\]\((.*?)\)/g;
        let m;
        while ((m = imgRegex.exec(text)) !== null) {
            const url = m[1]?.trim() ?? "";
            if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("/api/")) {
                return true; // 로컬 경로로 간주
            }
        }
        return false;
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
                if (!isEdit) {
                    setTitle((prev) => (prev.trim() ? prev : extractTitleFromMd(text)));
                }
                setSelectedFile(file);
                setError(null);
                if (hasLocalImageInMd(text)) {
                    pendingLocalImageOpenRef.current = () => imageInputRef.current?.click();
                    setShowLocalImageModal(true);
                }
            };
            reader.readAsText(file, "UTF-8");
            e.target.value = "";
        },
        [isEdit]
    );

    const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        if (pendingReplaceRef.current) {
            const { runUpdate } = pendingReplaceRef.current;
            pendingReplaceRef.current = null;
            runUpdate([...selectedImages, ...imageFiles]);
        } else {
            setSelectedImages(imageFiles);
        }
        e.target.value = "";
    }, [selectedImages]);

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
            const currentUser = getCurrentUser();
            const created = await createPostByUpload(selectedFile, {
                title: title.trim() || undefined,
                categoryId: selectedCategoryId,
                isNotice: isNotice,
                postKind: isAssignmentCategory ? "ASSIGNMENT" : undefined,
                images: selectedImages.length > 0 ? selectedImages : undefined,
                attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined,
                userId: currentUser?.id,
            });
            const targetPath = isAssignmentCategory ? `/posts/${created.id}/assignment` : `/posts/${created.id}`;
            navigate(`${targetPath}?${createSearchParams(searchParams).toString()}`);
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
    }, [selectedFile, title, selectedCategoryId, isNotice, isAssignmentCategory, selectedImages, selectedAttachments, searchParams, navigate]);

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

    /** 세부 실습 에디터에서 이미지 붙여넣기 시 해당 task의 descriptionMarkdown에만 반영 (개요로 들어가지 않도록) */
    const handleTaskEditorPaste = useCallback(
        (taskIndex: number) => async (e: React.ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith("image/")) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (!file) return;
                    setImageUploading(true);
                    try {
                        const { url } = await uploadImage(file);
                        const imageMd = `![](${url})`;
                        setAssignmentTasks((prev) =>
                            prev.map((t, i) => {
                                if (i !== taskIndex) return t;
                                const prevMd = (t.descriptionMarkdown ?? "").trimEnd();
                                const sep = prevMd ? "\n" : "";
                                return { ...t, descriptionMarkdown: prevMd + sep + imageMd };
                            })
                        );
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
        [uploadImage]
    );

    const handleRemoveLinkedAttachment = useCallback(
        async (attachmentUrl: string) => {
            if (!Number.isFinite(postId)) return;
            setRemovingAttachmentUrl(attachmentUrl);
            setError(null);
            try {
                await removePostAttachmentLink(postId, attachmentUrl);
                setLinkedAttachments((prev) => prev.filter((x) => x.url !== attachmentUrl));
            } catch (e) {
                const msg =
                    e instanceof ApiError ? e.message : e instanceof Error ? e.message : "첨부를 제거하지 못했습니다.";
                setError(msg);
            } finally {
                setRemovingAttachmentUrl(null);
            }
        },
        [postId]
    );

    const handleReplaceContentByUpload = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file || !Number.isFinite(postId)) return;
            if (!file.name.toLowerCase().endsWith(".md")) {
                setError(".md 파일만 선택해 주세요.");
                return;
            }
            const reader = new FileReader();
            reader.onload = async () => {
                const text = (reader.result as string) ?? "";
                const runUpdate = async (images: File[]) => {
                    setUploading(true);
                    setError(null);
                    try {
                        const currentUser = getCurrentUser();
                        await updateContentByUpload(postId, file, {
                            title: title.trim() || undefined,
                            images: images.length > 0 ? images : undefined,
                            attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined,
                            userId: currentUser?.id,
                        });
                        const contentRes = await fetchPostContent(postId);
                        setMarkdown(contentRes.markdown ?? "");
                    } catch (err) {
                        const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "본문 교체에 실패했습니다.";
                        setError(msg);
                    } finally {
                        setUploading(false);
                    }
                    e.target.value = "";
                };
                if (hasLocalImageInMd(text)) {
                    pendingReplaceRef.current = { runUpdate };
                    pendingLocalImageOpenRef.current = () => imageInputRef.current?.click();
                    setShowLocalImageModal(true);
                } else {
                    await runUpdate(selectedImages);
                }
            };
            reader.readAsText(file, "UTF-8");
        },
        [postId, title, selectedImages, selectedAttachments]
    );

    const handleSave = useCallback(async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            setError("제목을 입력해 주세요.");
            return;
        }
        if (!selectedCategoryId || selectedCategoryId <= 0) {
            setError("카테고리를 선택해 주세요.");
            return;
        }

        if (isAssignmentForm) {
            if (maxScore < 1 || maxScore > 1000) {
                setError("과제 배점은 1~1000 사이로 입력해 주세요.");
                return;
            }
            const taskSum = assignmentTasks.reduce((s, t) => s + (t.maxScore ?? 0), 0);
            if (assignmentTasks.length > 0 && taskSum !== maxScore) {
                setError(`세부 실습 배점 합이 ${maxScore}점이어야 합니다. 현재 합: ${taskSum}점`);
                return;
            }
        }

        setSaving(true);
        setError(null);
        try {
            const currentUser = getCurrentUser();
            if (isAssignmentForm && !isEdit) {
                const created = await createPost({
                    title: trimmedTitle,
                    summaryTitle: null,
                    categoryId: selectedCategoryId,
                    contentMd: markdown.trim() || "\n",
                    isNotice: isNotice,
                    postKind: "ASSIGNMENT",
                    maxScore: maxScore,
                    tasks: assignmentTasks.length > 0 ? assignmentTasks.map((t, i) => ({ ...t, sortOrder: i })) : undefined,
                    attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined,
                    userId: currentUser?.id,
                });
                navigate(`/posts/${created.id}/assignment?${createSearchParams(searchParams).toString()}`);
                return;
            }
            if (isAssignmentForm && isEdit) {
                await patchPost(postId, {
                    title: trimmedTitle,
                    summaryTitle: null,
                    categoryId: selectedCategoryId,
                    markdown: markdown || undefined,
                    isNotice: isNotice,
                    maxScore: maxScore,
                    tasks: assignmentTasks.map((t, i) => ({ ...t, sortOrder: i })),
                    attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined,
                    userId: currentUser?.id ?? undefined,
                });
                navigate(`/posts/${postId}/assignment?${createSearchParams(searchParams).toString()}`);
                return;
            }
            if (isEdit) {
                await patchPost(postId, {
                    title: trimmedTitle,
                    categoryId: selectedCategoryId,
                    markdown: markdown || undefined,
                    isNotice: isNotice,
                    attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined,
                    userId: currentUser?.id,
                });
                navigate(`/posts/${postId}?${createSearchParams(searchParams).toString()}`);
            } else {
                const created = await createPost({
                    title: trimmedTitle,
                    categoryId: selectedCategoryId,
                    contentMd: markdown.trim() || "\n",
                    isNotice: isNotice,
                    postKind: undefined,
                    attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined,
                    userId: currentUser?.id,
                });
                navigate(`/posts/${created.id}?${createSearchParams(searchParams).toString()}`);
            }
        } catch (e) {
            const msg =
                e instanceof ApiError ? e.message : e instanceof Error ? e.message : "저장에 실패했습니다.";
            setError(msg);
        } finally {
            setSaving(false);
        }
    }, [isEdit, isAssignmentForm, postId, title, summaryTitle, markdown, selectedCategoryId, isNotice, maxScore, assignmentTasks, selectedAttachments, searchParams, navigate]);

    const existingLinkedAttachmentsSection =
        isEdit && linkedAttachments.length > 0 ? (
            <div style={{ marginTop: 14, width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.85 }}>등록된 첨부파일</div>
                <ul
                    style={{
                        listStyle: "none",
                        margin: 0,
                        padding: 0,
                        border: "1px solid #ddd",
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#fff",
                    }}
                >
                    {linkedAttachments.map((item, idx) => (
                        <li
                            key={`${item.url}-${idx}`}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                                padding: "10px 12px",
                                borderBottom: idx < linkedAttachments.length - 1 ? "1px solid #eee" : undefined,
                                fontSize: 13,
                            }}
                        >
                            <span style={{ wordBreak: "break-all", minWidth: 0 }}>{item.name}</span>
                            <button
                                type="button"
                                title="게시글에서 첨부 링크 제거"
                                aria-label="첨부 제거"
                                disabled={removingAttachmentUrl !== null}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void handleRemoveLinkedAttachment(item.url);
                                }}
                                style={{
                                    flexShrink: 0,
                                    width: 32,
                                    height: 32,
                                    border: "none",
                                    background: "transparent",
                                    color: "#dc2626",
                                    fontSize: 22,
                                    lineHeight: 1,
                                    cursor: removingAttachmentUrl !== null ? "not-allowed" : "pointer",
                                    fontWeight: 700,
                                }}
                            >
                                {removingAttachmentUrl === item.url ? "…" : "×"}
                            </button>
                        </li>
                    ))}
                </ul>
                <div style={{ fontSize: 11, opacity: 0.65, marginTop: 6 }}>
                    링크만 제거합니다. 파일은 서버에 남아 있으며, 이후 버전부터 상세·목록 첨부 목록에 표시되지 않습니다.
                </div>
            </div>
        ) : null;

    if (loading) {
        return (
            <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>불러오는 중...</div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "100%", minWidth: 0, boxSizing: "border-box" }}>
            {showLocalImageModal && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10000,
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            pendingLocalImageOpenRef.current = null;
                            pendingReplaceRef.current = null;
                            setShowLocalImageModal(false);
                        }
                    }}
                >
                    <div
                        style={{
                            background: "#fff",
                            padding: 24,
                            borderRadius: 12,
                            maxWidth: 400,
                            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#111" }}>
                            Markdown 내 로컬 PC의 이미지가 있습니다. 같이 첨부해주세요.
                        </p>
                        <p style={{ margin: "12px 0 0", fontSize: 13, color: "#666" }}>
                            확인을 누르면 파일 선택 창이 열립니다.
                        </p>
                        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => {
                                    pendingLocalImageOpenRef.current = null;
                                    pendingReplaceRef.current = null;
                                    setShowLocalImageModal(false);
                                }}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 6,
                                    border: "1px solid #d1d5db",
                                    background: "#f3f4f6",
                                    color: "#374151",
                                    fontSize: 14,
                                    fontWeight: 500,
                                    cursor: "pointer",
                                }}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const openFile = pendingLocalImageOpenRef.current;
                                    pendingLocalImageOpenRef.current = null;
                                    openFile?.();
                                    setShowLocalImageModal(false);
                                }}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 6,
                                    border: "none",
                                    background: "#3B82F6",
                                    color: "#fff",
                                    fontSize: 14,
                                    fontWeight: 500,
                                    cursor: "pointer",
                                }}
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>
                        {isAssignmentForm ? (isEdit ? "과제 수정" : "과제 등록") : isEdit ? "게시글 수정" : "게시글 등록"}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                        {isAssignmentForm ? (
                            <>실습명, 실습 개요, 세부 실습, 배점을 입력하세요.</>
                        ) : isEdit ? (
                            <>id=<b>{id}</b></>
                        ) : (
                            <>카테고리를 선택한 뒤 제목·본문을 입력하세요.</>
                        )}
                    </div>
                </div>

                <div className="header-actions" style={{ display: "flex", gap: 8, alignItems: "stretch", flexWrap: "wrap" }}>
                    {!isEdit && (
                        <>
                            <label
                                style={{
                                    minHeight: 42,
                                    padding: "10px 14px",
                                    borderRadius: 6,
                                    border: "none",
                                    background: "#f3f4f6",
                                    color: "#374151",
                                    fontWeight: 500,
                                    fontSize: 14,
                                    cursor: "pointer",
                                    boxSizing: "border-box",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                .md 파일로 등록
                                <input
                                    type="file"
                                    accept=".md"
                                    onChange={handleFileSelect}
                                    style={{ display: "none" }}
                                />
                            </label>
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageSelect}
                                style={{ display: "none" }}
                            />
                            {selectedFile && (
                                <button
                                    type="button"
                                    onClick={handleCreateByUpload}
                                    disabled={uploading}
                                    style={{
                                        minHeight: 42,
                                        padding: "10px 14px",
                                        borderRadius: 6,
                                        border: "none",
                                        background: uploading ? "#9ca3af" : "#3B82F6",
                                        color: "#fff",
                                        fontWeight: 500,
                                        fontSize: 14,
                                        cursor: uploading ? "not-allowed" : "pointer",
                                        opacity: uploading ? 0.7 : 1,
                                        boxSizing: "border-box",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
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
                                style={{
                                    minHeight: 42,
                                    padding: "10px 14px",
                                    borderRadius: 6,
                                    border: "none",
                                    background: uploading ? "#e5e7eb" : "#f3f4f6",
                                    color: "#374151",
                                    fontWeight: 500,
                                    fontSize: 14,
                                    cursor: uploading ? "not-allowed" : "pointer",
                                    boxSizing: "border-box",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
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
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageSelect}
                                style={{ display: "none" }}
                                disabled={uploading}
                            />
                        </>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || uploading}
                        style={{
                            width: 90,
                            minHeight: 42,
                            padding: "10px 14px",
                            borderRadius: 6,
                            border: "none",
                            background: "#3B82F6",
                            color: "#fff",
                            fontWeight: 500,
                            fontSize: 14,
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
                            borderRadius: 6,
                            border: "none",
                            textDecoration: "none",
                            color: "#374151",
                            background: "#f3f4f6",
                            fontWeight: 500,
                            fontSize: 14,
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
                            {categoryOptions.map((item, idx) => {
                                if (item.type === 'label') {
                                    return (
                                        <option key={`label-${idx}`} disabled style={{ fontWeight: 600, background: "#f5f5f5" }}>
                                            {item.label}
                                        </option>
                                    );
                                }
                                return (
                                    <option key={item.category.id} value={item.category.id}>
                                        {item.indent ? "\u00A0\u00A0\u00A0\u00A0" + item.category.label : item.category.label}
                                    </option>
                                );
                            })}
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
                        {isAssignmentForm ? "실습명" : "제목"}
                    </label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={isAssignmentForm ? "실습명" : "제목"}
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

                {isAssignmentForm && (
                    <>
                        <div>
                            <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                                실습 개요
                            </label>
                            <div data-color-mode="light" onPaste={handleEditorPaste}>
                                <MDEditor
                                    value={markdown}
                                    onChange={(val) => setMarkdown(val ?? "")}
                                    height={320}
                                    minHeight={200}
                                    preview="live"
                                    visibleDragbar={true}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                                배점
                            </label>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                    type="number"
                                    min={1}
                                    max={1000}
                                    value={maxScore}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onChange={(e) => setMaxScore(Math.max(1, Math.min(1000, Number(e.target.value) || 100)))}
                                    style={{
                                        width: 100,
                                        padding: "8px 10px",
                                        borderRadius: 8,
                                        border: "1px solid #444",
                                    }}
                                />
                                <span style={{ fontSize: 12 }}>점 (세부 실습 배점 합)</span>
                            </div>
                        </div>
                        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, background: "#fafafa" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <label style={{ fontSize: 13, fontWeight: 600 }}>세부 실습</label>
                                <span style={{ fontSize: 12, color: assignmentTasks.reduce((s, t) => s + (t.maxScore ?? 0), 0) === maxScore ? "#059669" : "#dc2626" }}>
                                    배점 합: {assignmentTasks.reduce((s, t) => s + (t.maxScore ?? 0), 0)} / {maxScore}점
                                </span>
                            </div>
                            <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
                                세부 실습별로 내용(MD)과 배점을 입력하세요. 세부 실습 배점 합이 위 배점과 같아야 합니다.
                            </p>
                            {assignmentTasks.map((task, idx) => (
                                <div key={idx} style={{ marginBottom: 16, padding: 12, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                                        <strong style={{ fontSize: 13 }}>세부 실습 {idx + 1}</strong>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <label style={{ fontSize: 12 }}>난이도</label>
                                            <select
                                                value={task.difficulty ?? "MEDIUM"}
                                                onChange={(e) => setAssignmentTasks((prev) => prev.map((t, i) => i === idx ? { ...t, difficulty: e.target.value } : t))}
                                                style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid #444" }}
                                            >
                                                <option value="LOW">하</option>
                                                <option value="MEDIUM">중</option>
                                                <option value="HIGH">상</option>
                                            </select>
                                            <label style={{ fontSize: 12 }}>배점</label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={task.maxScore ?? 0}
                                                onFocus={(e) => e.currentTarget.select()}
                                                onChange={(e) => {
                                                    const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                                    setAssignmentTasks((prev) => prev.map((t, i) => i === idx ? { ...t, maxScore: v } : t));
                                                }}
                                                style={{ width: 64, padding: "6px 8px", borderRadius: 6, border: "1px solid #444" }}
                                            />
                                            <span style={{ fontSize: 12 }}>점</span>
                                            <button
                                                type="button"
                                                onClick={() => setAssignmentTasks((prev) => prev.filter((_, i) => i !== idx))}
                                                style={{ fontSize: 12, padding: "4px 8px", color: "#dc2626", border: "1px solid #dc2626", borderRadius: 6, background: "transparent", cursor: "pointer" }}
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </div>
                                    <div data-color-mode="light" onPaste={handleTaskEditorPaste(idx)}>
                                        <MDEditor
                                            value={task.descriptionMarkdown ?? ""}
                                            onChange={(val) => setAssignmentTasks((prev) => prev.map((t, i) => i === idx ? { ...t, descriptionMarkdown: val ?? "" } : t))}
                                            height={200}
                                            minHeight={120}
                                            preview="live"
                                            visibleDragbar={true}
                                        />
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setAssignmentTasks((prev) => [...prev, { title: `세부 실습 ${prev.length + 1}`, descriptionMarkdown: "", sortOrder: prev.length, maxScore: 0, difficulty: "MEDIUM" }])}
                                style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #3B82F6", background: "#eff6ff", color: "#3B82F6", fontWeight: 500, cursor: "pointer", fontSize: 13 }}
                            >
                                + 세부 실습 추가
                            </button>
                        </div>
                        <div style={{ maxWidth: "100%", boxSizing: "border-box" }}>
                            <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 4 }}>첨부파일 (선택)</label>
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    setSelectedAttachments((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
                                }}
                                style={{
                                    minHeight: 80,
                                    padding: 12,
                                    borderRadius: 10,
                                    border: `2px dashed ${isDragging ? "#2563eb" : "#444"}`,
                                    background: isDragging ? "#e3f2fd" : "#fafafa",
                                    cursor: "pointer",
                                }}
                                onClick={() => {
                                    const input = document.createElement("input");
                                    input.type = "file";
                                    input.multiple = true;
                                    input.onchange = (e) => setSelectedAttachments((prev) => [...prev, ...Array.from((e.target as HTMLInputElement).files || [])]);
                                    input.click();
                                }}
                            >
                                {selectedAttachments.length === 0
                                    ? "파일을 드래그하거나 클릭하여 선택"
                                    : `${selectedAttachments.length}개 파일 선택됨 · 클릭하여 추가`}
                                {selectedAttachments.length > 0 && selectedAttachments.map((file, i) => (
                                    <div key={i} style={{ marginTop: 4, fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                                        <span>{file.name}</span>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedAttachments((prev) => prev.filter((_, j) => j !== i)); }}>삭제</button>
                                    </div>
                                ))}
                            </div>
                            {existingLinkedAttachmentsSection}
                        </div>
                    </>
                )}

                {!isAssignmentForm && (
                <>
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
                    {existingLinkedAttachmentsSection}
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
                </>
                )}
            </div>
            <ErrorModal open={!!error} message={error ?? ""} onClose={() => setError(null)} />
        </div>
    );
}
