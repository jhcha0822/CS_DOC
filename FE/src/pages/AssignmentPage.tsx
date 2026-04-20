import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams, createSearchParams } from "react-router-dom";
import MarkdownPreview from "@uiw/react-markdown-preview";
import "@uiw/react-markdown-preview/markdown.css";
import { markdownPreviewImageComponents } from "../components/MarkdownImageWithModal";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import {
    ApiError,
    fetchAssignmentPage,
    saveReview,
    fetchCategories,
    deletePost,
    createMySubmission,
    putSubmissionAnswer,
    submitSubmission,
    addSubmissionAttachments,
    uploadImage,
    incrementViewCount,
    buildAttachmentDownloadUrl,
    type AssignmentPageResponse,
    type AssignmentTaskItem,
    type CategoryItem,
    type TaskScoreItem,
} from "../lib/api";
import { getCurrentUser } from "../lib/auth";
import ErrorModal from "../components/ErrorModal";
import AssignmentRequestFormModal from "../components/AssignmentRequestFormModal";


function formatDateTime(iso: string | null) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = String(d.getFullYear()).slice(-2); // 마지막 2자리만
    return `${year}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatKST(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 제출 첨부파일 JSON 파싱 → { url, name }[] */
function parseAttachments(json: string | null): { url: string; name: string | null }[] {
    if (!json || json.trim() === "" || json.trim() === "[]") return [];
    try {
        const parsed = JSON.parse(json);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((p: unknown) => {
                if (typeof p === "string") return { url: p, name: null };
                if (p && typeof p === "object" && "url" in p) {
                    const o = p as { url: string; name?: string };
                    return { url: o.url, name: o.name ?? null };
                }
                return null;
            })
            .filter((x): x is { url: string; name: string | null } => x != null && x.url?.trim() !== "");
    } catch {
        return [];
    }
}

export default function AssignmentPage() {
    const { id } = useParams<{ id: string }>();
    const [sp] = useSearchParams();
    const navigate = useNavigate();
    const postId = id ? parseInt(id, 10) : null;
    const viewCountIncrementedRef = useRef<number | null>(null);
    const [data, setData] = useState<AssignmentPageResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [deleting, setDeleting] = useState(false);
    const [answerDraft, setAnswerDraft] = useState("");
    /** 세부 실습별 답안 초안 (taskId -> markdown). tasks가 있을 때만 사용 */
    const [taskAnswerDrafts, setTaskAnswerDrafts] = useState<Record<number, string>>({});
    const [savingAnswer, setSavingAnswer] = useState(false);
    const [startingSubmission, setStartingSubmission] = useState(false);
    const [uploadingAttachments, setUploadingAttachments] = useState(false);
    /** 선택한 파일명 (업로드 전/중 표시용). 업로드 완료 후 서버 데이터로 대체되므로 여기서는 비움 */
    const [pendingAttachmentNames, setPendingAttachmentNames] = useState<string[]>([]);
    /** 제출 완료 상태에서 '수정' 클릭 시 편집 모드 (평가 완료 전까지 수정 가능) */
    const [isEditingAfterSubmit, setIsEditingAfterSubmit] = useState(false);
    /** 에디터 내 이미지 업로드 중 표시 */
    const [imageUploading, setImageUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    /** 이미지 삽입 대상: 'single' = 통합 답안, number = taskId */
    const focusedAnswerTargetRef = useRef<"single" | number | null>(null);
    const user = getCurrentUser();

    /** 모든 답변: 제출별 평가 입력/수정용. submissionId -> taskId -> { score, feedbackText } */
    const [pendingReviewBySub, setPendingReviewBySub] = useState<Record<number, Record<number, { score: number; feedbackText: string }>>>({});
    /** 평가 수정 모드인 제출 ID (GRADED인데 관리자가 수정 클릭 시) */
    const [editingReviewSubmissionId, setEditingReviewSubmissionId] = useState<number | null>(null);
    /** 실습 결과 작성 요청 모달 (관리자용) */
    const [requestFormModalOpen, setRequestFormModalOpen] = useState(false);

    useEffect(() => {
        fetchCategories()
            .then((list) => setCategories(list ?? []))
            .catch(() => setCategories([]));
    }, []);

    // 브레드크럼 경로 생성 함수
    const getBreadcrumbPath = useCallback((categoryId: number | null): string[] => {
        if (!categoryId) return [];
        const path: string[] = [];
        let currentId: number | null = categoryId;
        
        while (currentId) {
            const category = categories.find(c => c.id === currentId);
            if (!category) break;
            path.unshift(category.label);
            currentId = category.parentId;
        }
        
        return path;
    }, [categories]);

    const handleDelete = useCallback(async () => {
        if (!postId) return;
        if (!window.confirm("정말 이 게시글을 삭제하시겠습니까?\n삭제된 게시글은 목록에서 보이지 않지만 데이터베이스에는 유지되어 추후 복구할 수 있습니다.")) {
            return;
        }
        setDeleting(true);
        try {
            await deletePost(postId);
            navigate("/posts");
        } catch (e) {
            alert(e instanceof Error ? e.message : "삭제 실패");
        } finally {
            setDeleting(false);
        }
    }, [postId, navigate]);

    useEffect(() => {
        if (postId == null || Number.isNaN(postId)) {
            setError("잘못된 과제 ID입니다.");
            setLoading(false);
            return;
        }
        if (viewCountIncrementedRef.current !== postId) {
            viewCountIncrementedRef.current = null;
        }
        setLoading(true);
        setError(null);
        fetchAssignmentPage(postId)
            .then((res) => {
                setData(res);
                if (res && viewCountIncrementedRef.current !== postId) {
                    viewCountIncrementedRef.current = postId;
                    incrementViewCount(postId).catch((err) => {
                        console.warn("Failed to increment view count:", err);
                        if (viewCountIncrementedRef.current === postId) viewCountIncrementedRef.current = null;
                    });
                }
            })
            .catch((e) => {
                setError(e instanceof Error ? e.message : "과제를 불러올 수 없습니다.");
            })
            .finally(() => setLoading(false));
    }, [postId]);

    // 내 답변 초기값 동기화 (세부 실습 있으면 taskAnswers, 없으면 answerMarkdown)
    useEffect(() => {
        if (!data?.mySubmission) return;
        const sub = data.mySubmission;
        if (data.tasks && data.tasks.length > 0 && sub.taskAnswers) {
            const byTask: Record<number, string> = {};
            for (const ta of sub.taskAnswers) {
                byTask[ta.taskId] = ta.answerMarkdown ?? "";
            }
            setTaskAnswerDrafts(byTask);
        } else {
            setAnswerDraft(sub.answerMarkdown ?? "");
        }
    }, [data?.mySubmission?.submissionId, data?.mySubmission?.answerMarkdown, data?.mySubmission?.taskAnswers, data?.tasks]);

    // 평가 완료되면 수정 모드 해제
    useEffect(() => {
        if (data?.mySubmission?.status === "GRADED") setIsEditingAfterSubmit(false);
    }, [data?.mySubmission?.status]);

    /** 실제 글이 가진 세부 실습만 표시 (API 중복/오래된 데이터 방지). taskId 기준 첫 번째만 유지 */
    const displayTasks = useMemo(() => {
        const tasks = data?.tasks ?? [];
        const seen = new Set<number>();
        return tasks.filter((t) => {
            if (seen.has(t.taskId)) return false;
            seen.add(t.taskId);
            return true;
        });
    }, [data?.tasks]);

    const handleSaveReview = async (
        submissionId: number,
        score: number,
        feedbackText: string,
        taskScores?: TaskScoreItem[]
    ) => {
        if (!postId) return;
        setSaving(`review-${submissionId}`);
        try {
            await saveReview(submissionId, score, feedbackText, taskScores);
            const next = await fetchAssignmentPage(postId);
            setData(next);
        } catch (e) {
            alert(e instanceof Error ? e.message : "평가 저장 실패");
        } finally {
            setSaving(null);
        }
    };

    const handleStartSubmission = useCallback(async () => {
        if (!postId || !user) return;
        setStartingSubmission(true);
        try {
            await createMySubmission(postId);
            const next = await fetchAssignmentPage(postId);
            setData(next ?? null);
            if (next?.tasks?.length && next?.mySubmission?.taskAnswers?.length) {
                const byTask: Record<number, string> = {};
                for (const ta of next.mySubmission.taskAnswers) {
                    byTask[ta.taskId] = ta.answerMarkdown ?? "";
                }
                setTaskAnswerDrafts(byTask);
            } else {
                setAnswerDraft(next?.mySubmission?.answerMarkdown ?? "");
            }
        } catch (e) {
            alert(e instanceof Error ? e.message : "제출을 시작할 수 없습니다.");
        } finally {
            setStartingSubmission(false);
        }
    }, [postId, user]);

    const handleSaveDraft = useCallback(async (options?: { onSuccess?: () => void }) => {
        if (!postId || !data?.mySubmission) return;
        if (data.mySubmission.status === "GRADED") return;
        setSavingAnswer(true);
        try {
            const sid = data.mySubmission.submissionId;
            if (displayTasks.length > 0) {
                for (const task of displayTasks) {
                    await putSubmissionAnswer(sid, taskAnswerDrafts[task.taskId] ?? "", task.taskId);
                }
            } else {
                await putSubmissionAnswer(sid, answerDraft);
            }
            const next = await fetchAssignmentPage(postId);
            setData(next);
            options?.onSuccess?.();
        } catch (e) {
            alert(e instanceof Error ? e.message : "임시 저장에 실패했습니다.");
        } finally {
            setSavingAnswer(false);
        }
    }, [postId, data?.mySubmission, displayTasks, answerDraft, taskAnswerDrafts]);

    const handleSubmitAnswer = useCallback(async () => {
        if (!postId || !data?.mySubmission || data.mySubmission.status !== "DRAFT") return;
        setSavingAnswer(true);
        try {
            const sid = data.mySubmission.submissionId;
            // 제출 전 현재 답안 내용 먼저 저장
            if (displayTasks.length > 0) {
                for (const task of displayTasks) {
                    await putSubmissionAnswer(sid, taskAnswerDrafts[task.taskId] ?? "", task.taskId);
                }
            } else {
                await putSubmissionAnswer(sid, answerDraft);
            }
            await submitSubmission(sid);
            const next = await fetchAssignmentPage(postId);
            setData(next);
        } catch (e) {
            alert(e instanceof Error ? e.message : "제출에 실패했습니다.");
        } finally {
            setSavingAnswer(false);
        }
    }, [postId, data?.mySubmission, displayTasks, answerDraft, taskAnswerDrafts]);

    const handleAddAttachments = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const fileList = e.target.files;
            if (!fileList?.length || !postId || !data?.mySubmission) return;
            const files = Array.from(fileList);
            const names = files.map((f) => f.name || "파일");
            e.target.value = "";
            setPendingAttachmentNames((prev) => [...prev, ...names]);
            const currentAnswerDraft = answerDraft;
            const currentTaskDrafts = { ...taskAnswerDrafts };
                const currentTasks = displayTasks;
            setUploadingAttachments(true);
            try {
                await addSubmissionAttachments(data.mySubmission.submissionId, files);
                setPendingAttachmentNames([]);
                const next = await fetchAssignmentPage(postId);
                setData((prev) => {
                    if (!prev || !next?.mySubmission) return next ?? prev;
                    const nextMy = next.mySubmission;
                    const preservedTaskAnswers =
                        currentTasks?.length && Object.keys(currentTaskDrafts).length > 0
                            ? currentTasks.map((t) => ({
                                  taskId: t.taskId,
                                  answerMarkdown: currentTaskDrafts[t.taskId] ?? "",
                              }))
                            : nextMy.taskAnswers;
                    return {
                        ...next,
                        mySubmission: {
                            ...nextMy,
                            attachments: nextMy.attachments,
                            answerMarkdown: currentAnswerDraft !== "" ? currentAnswerDraft : nextMy.answerMarkdown,
                            taskAnswers: preservedTaskAnswers,
                        },
                    };
                });
            } catch (err) {
                setPendingAttachmentNames([]);
                alert(err instanceof Error ? err.message : "첨부파일 업로드에 실패했습니다.");
            } finally {
                setUploadingAttachments(false);
            }
        },
        [postId, data?.mySubmission, displayTasks, answerDraft, taskAnswerDrafts]
    );

    /** 답안 에디터에 이미지 URL 삽입. 한 줄 ![](url) 형식으로 삽입 */
    const insertImageIntoAnswerDraft = useCallback((url: string, target: "single" | number) => {
        const imageMd = `![](${url})`;
        if (target === "single") {
            setAnswerDraft((prev) => {
                const p = (prev ?? "").trimEnd();
                return p + (p ? "\n" : "") + imageMd;
            });
        } else {
            setTaskAnswerDrafts((prev) => {
                const p = (prev[target] ?? "").trimEnd();
                const sep = p ? "\n" : "";
                return { ...prev, [target]: p + sep + imageMd };
            });
        }
    }, []);

    const handleAnswerImageSelect = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file || !file.type.startsWith("image/")) return;
            const target = focusedAnswerTargetRef.current;
            if (target === null) return;
            setImageUploading(true);
            try {
                const { url } = await uploadImage(file);
                insertImageIntoAnswerDraft(url, target);
            } catch (err) {
                alert(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.");
            } finally {
                setImageUploading(false);
                focusedAnswerTargetRef.current = null;
            }
        },
        [insertImageIntoAnswerDraft]
    );

    const handleAnswerImagePaste = useCallback(
        (target: "single" | number) => async (e: React.ClipboardEvent) => {
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
                        insertImageIntoAnswerDraft(url, target);
                    } catch (err) {
                        alert(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.");
                    } finally {
                        setImageUploading(false);
                    }
                    return;
                }
            }
        },
        [insertImageIntoAnswerDraft]
    );

    const listSearchParams = useCallback(() => {
        const p: Record<string, string> = {};
        if (sp.get("cat")) p.cat = sp.get("cat")!;
        if (sp.get("q")) p.q = sp.get("q")!;
        return p;
    }, [sp]);

    if (loading) return <div className="p-4">로딩 중...</div>;
    if (error || !data) {
        return (
            <div style={{ maxWidth: "100%", minWidth: 0 }}>
                <div className="p-4">과제를 불러올 수 없습니다.</div>
                <ErrorModal open={!!error} message={error ?? "데이터 없음"} onClose={() => setError(null)} />
            </div>
        );
    }

    const mySub = data.mySubmission;
    const isAdmin = user?.role === "ADMIN";
    /** 모든 답변 목록은 평가자(관리자) 권한에만 노출. 피평가자는 본인 답변만 '내 답변'에서 확인·수정 */
    const canViewAll = isAdmin;

    const breadcrumbPath = data.categoryId ? getBreadcrumbPath(data.categoryId) : [];
    const listUrl = `/posts?${createSearchParams(listSearchParams()).toString()}`;
    const editUrl = postId != null ? `/posts/${postId}/edit?${createSearchParams(listSearchParams()).toString()}` : "/posts";

    /** 세부 실습 라벨: "세부 실습 N" 하나만 표시. 제목이 기본 패턴(세부 실습 \d+)이면 번호만, 그 외 커스텀 제목일 때만 " · 제목" 추가 */
    const taskLabel = (idx: number, title: string | undefined) => {
        const defaultName = `세부 실습 ${idx + 1}`;
        if (!title || !title.trim()) return defaultName;
        const t = title.trim();
        if (/^세부 실습 \d+$/.test(t)) return defaultName;
        if (t === defaultName) return defaultName;
        return `${defaultName} · ${t}`;
    };

    return (
        <>
        <div style={{ maxWidth: "100%", minWidth: 0 }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    minHeight: 42,
                }}
            >
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    {/* 브레드크럼 */}
                    {!loading && !error && data && breadcrumbPath.length > 0 && (
                        <div style={{ marginBottom: 2, fontSize: 13, color: "#6b7280" }}>
                            {breadcrumbPath.map((label, idx) => (
                                <span key={idx}>
                                    {idx > 0 && <span style={{ margin: "0 6px", color: "#9ca3af" }}>&gt;</span>}
                                    <span style={{ color: idx === breadcrumbPath.length - 1 ? "#6b7280" : "#9ca3af" }}>
                                        {label}
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}
                    {loading ? (
                        <div style={{ fontSize: 24, fontWeight: 700 }}>불러오는 중...</div>
                    ) : error ? (
                        <div style={{ fontSize: 24, fontWeight: 700 }}>과제 상세</div>
                    ) : data ? (
                        <>
                            <div style={{ fontSize: 24, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>{data.title}</div>
                        </>
                    ) : (
                        <div style={{ fontSize: 24, fontWeight: 700 }}>과제 상세</div>
                    )}
                </div>

                {/* 작성/수정 시각 메타데이터 - 버튼 왼쪽에 배치 (게시글 상세와 동일) */}
                {!loading && !error && data && (
                    <div style={{ textAlign: "right", fontSize: 13, color: "#9ca3af", lineHeight: 1.6, marginRight: 12, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <div>작성 {formatKST(data.createdAt)}</div>
                        <div>수정 {formatKST(data.updatedAt ?? data.createdAt)}</div>
                    </div>
                )}

                <div className="header-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch" }}>
                    {isAdmin && (
                        <>
                            <button
                                onClick={() => setRequestFormModalOpen(true)}
                                style={{
                                    minHeight: 42,
                                    padding: "10px 14px",
                                    borderRadius: 6,
                                    border: "1px solid #059669",
                                    fontSize: 14,
                                    color: "#059669",
                                    background: "#fff",
                                    fontWeight: 500,
                                    boxSizing: "border-box",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                }}
                            >
                                실습 결과 요청
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                style={{
                                    width: 90,
                                    minHeight: 42,
                                    padding: "10px 14px",
                                    borderRadius: 6,
                                    border: "none",
                                    fontSize: 14,
                                    color: "#fff",
                                    background: deleting ? "#9ca3af" : "#dc2626",
                                    fontWeight: 500,
                                    boxSizing: "border-box",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: deleting ? "not-allowed" : "pointer",
                                }}
                            >
                                {deleting ? "삭제 중..." : "삭제"}
                            </button>
                            <Link
                                to={editUrl}
                                style={{
                                    width: 90,
                                    minHeight: 42,
                                    padding: "10px 14px",
                                    borderRadius: 6,
                                    border: "none",
                                    textDecoration: "none",
                                    fontSize: 14,
                                    color: "#fff",
                                    background: "#3B82F6",
                                    fontWeight: 500,
                                    boxSizing: "border-box",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                수정
                            </Link>
                        </>
                    )}
                    <Link
                        to={listUrl}
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
                            boxSizing: "border-box",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        목록
                    </Link>
                </div>
            </div>

            {/* 실습 내용 및 상세 정보 - 게시글 상세와 동일한 content-card 스타일 */}
            {!loading && !error && data && (
                <section style={{ marginTop: 16, marginBottom: 24 }}>
                    <div
                        className="content-card"
                        style={{
                            padding: 20,
                            borderRadius: 6,
                            border: "1px solid #e5e7eb",
                            backgroundColor: "#fff",
                            color: "#111827",
                            minHeight: 120,
                        }}
                    >
                        {/* 첫 번째 정보 행 */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 24 }}>
                            <div>
                                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                                    등록자
                                </div>
                                <div style={{ fontSize: 14, color: "#111827" }}>
                                    {data.createdByName || "-"}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                                    등록 일시
                                </div>
                                <div style={{ fontSize: 14, color: "#111827" }}>
                                    {data.createdAt ? formatDateTime(data.createdAt) : "-"}
                                </div>
                            </div>
                            {data.maxScore != null && (
                                <div>
                                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                                        배점
                                    </div>
                                    <div style={{ fontSize: 14, color: "#111827" }}>
                                        {data.maxScore}점
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 실습 내용 (개요) */}
                        {data.problemMarkdown && (
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
                                    실습 내용 (개요)
                                </div>
                                <div
                                    style={{
                                        padding: 16,
                                        backgroundColor: "var(--app-bg)",
                                        borderRadius: 6,
                                        border: "1px solid #e5e7eb",
                                    }}
                                >
                                    <div className="markdown-preview" data-color-mode="light">
                                        <MarkdownPreview components={markdownPreviewImageComponents} source={data.problemMarkdown} />
                                    </div>
                                </div>
                                    {parseAttachments(data.postAttachments ?? null).length > 0 && (
                                        <div style={{ marginTop: 12, padding: 12, background: "#f5f5f5", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>첨부파일</div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                {parseAttachments(data.postAttachments ?? null).map((item, idx) => {
                                                    const fileName = item.name || item.url.split("/").pop() || `첨부파일 ${idx + 1}`;
                                                    const downloadHref = buildAttachmentDownloadUrl(item.url, fileName);
                                                    return (
                                                        <a key={idx} href={downloadHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#3B82F6" }}>
                                                            📎 {fileName}
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        {/* 세부 실습 목록 */}
                        {displayTasks.length > 0 && (
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
                                    세부 실습
                                </div>
                                {displayTasks.map((task, idx) => (
                                    <div
                                        key={task.taskId ?? idx}
                                        style={{
                                            marginBottom: 20,
                                            padding: 16,
                                            backgroundColor: "#fff",
                                            borderRadius: 6,
                                            border: "1px solid #e5e7eb",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                                                {taskLabel(idx, task.title)}
                                            </span>
                                            <span style={{ fontSize: 13, color: "#6b7280" }}>
                                                세부 실습 배점: <strong>{task.maxScore}점</strong>
                                            </span>
                                        </div>
                                        {task.descriptionMarkdown ? (
                                            <div
                                                style={{
                                                    padding: 16,
                                                    backgroundColor: "var(--app-bg)",
                                                    borderRadius: 6,
                                                    border: "1px solid #e5e7eb",
                                                }}
                                            >
                                                <div className="markdown-preview" data-color-mode="light">
                                                    <MarkdownPreview components={markdownPreviewImageComponents} source={task.descriptionMarkdown} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: 13, color: "#9ca3af" }}>내용 없음</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* 내 답변 (피평가자 제출) - 관리자 계정에는 미노출 */}
            {!loading && !error && data && !isAdmin && (
                <section style={{ marginTop: 24, marginBottom: 24 }}>
                    <div
                        className="content-card"
                        style={{
                            padding: 20,
                            borderRadius: 6,
                            border: "1px solid #e5e7eb",
                            backgroundColor: "#fff",
                            color: "#111827",
                        }}
                    >
                        <h2 className="text-lg font-semibold mb-3" style={{ color: "#111827", marginTop: 0 }}>내 답변</h2>
                    {!user ? (
                        <p style={{ color: "#6b7280" }}>로그인 후 제출할 수 있습니다.</p>
                    ) : !mySub ? (
                        <div>
                            <p style={{ marginBottom: 12, color: "#6b7280" }}>제출을 시작하면 답안을 작성하고 제출할 수 있습니다.</p>
                            <button
                                type="button"
                                disabled={startingSubmission}
                                onClick={handleStartSubmission}
                                style={{
                                    padding: "10px 16px",
                                    borderRadius: 8,
                                    border: "none",
                                    background: startingSubmission ? "#9ca3af" : "#3B82F6",
                                    color: "#fff",
                                    fontWeight: 600,
                                    cursor: startingSubmission ? "not-allowed" : "pointer",
                                }}
                            >
                                {startingSubmission ? "제출 준비 중…" : "제출 시작"}
                            </button>
                        </div>
                    ) : (mySub.status === "DRAFT" || (mySub.status === "SUBMITTED" && isEditingAfterSubmit)) ? (
                        <div style={{ padding: 0 }}>
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={handleAnswerImageSelect}
                            />
                            {mySub.status === "SUBMITTED" && (
                                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>평가 전까지 답안을 수정할 수 있습니다.</p>
                            )}
                            {displayTasks.length > 0 ? (
                                <>
                                    {displayTasks.map((task, idx) => (
                                        <div key={task.taskId} style={{ marginBottom: 20 }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                                <label style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>
                                                    {taskLabel(idx, task.title)} 답변
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        focusedAnswerTargetRef.current = task.taskId;
                                                        imageInputRef.current?.click();
                                                    }}
                                                    disabled={imageUploading}
                                                    style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", color: "#374151", cursor: imageUploading ? "not-allowed" : "pointer" }}
                                                >
                                                    🖼️ 이미지 삽입
                                                </button>
                                            </div>
                                            <div
                                                data-color-mode="light"
                                                onFocus={() => { focusedAnswerTargetRef.current = task.taskId; }}
                                                onPaste={handleAnswerImagePaste(task.taskId)}
                                            >
                                                <MDEditor
                                                    value={taskAnswerDrafts[task.taskId] ?? ""}
                                                    onChange={(v) => setTaskAnswerDrafts((prev) => ({ ...prev, [task.taskId]: v ?? "" }))}
                                                    height={200}
                                                />
                                            </div>
                                            {imageUploading && <span style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>이미지 업로드 중…</span>}
                                        </div>
                                    ))}
                                    {/* 첨부파일 */}
                                    <div style={{ marginTop: 16, marginBottom: 12 }}>
                                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#374151" }}>첨부파일</div>
                                        {(() => {
                                            const list = parseAttachments(mySub.attachments);
                                            return (
                                                <>
                                                    {(list.length > 0 || pendingAttachmentNames.length > 0) && (
                                                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                                                            {list.map((item, idx) => {
                                                                const fileName = item.name || item.url.split("/").pop() || `첨부파일 ${idx + 1}`;
                                                                const downloadHref = buildAttachmentDownloadUrl(item.url, fileName);
                                                                return (
                                                                    <a key={idx} href={downloadHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#3B82F6" }}>
                                                                        📎 {fileName}
                                                                    </a>
                                                                );
                                                            })}
                                                            {pendingAttachmentNames.map((name, idx) => (
                                                                <span key={`pending-${idx}`} style={{ fontSize: 13, color: "#6b7280" }}>
                                                                    📎 {name} {uploadingAttachments ? "(업로드 중…)" : ""}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <input
                                                        type="file"
                                                        multiple
                                                        disabled={uploadingAttachments}
                                                        onChange={handleAddAttachments}
                                                        style={{ fontSize: 13 }}
                                                    />
                                                    {uploadingAttachments && <span style={{ marginLeft: 8, fontSize: 13, color: "#6b7280" }}>업로드 중…</span>}
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                        {mySub.status === "SUBMITTED" ? (
                                            <>
                                                <button type="button" disabled={savingAnswer} onClick={() => handleSaveDraft({ onSuccess: () => setIsEditingAfterSubmit(false) })} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: savingAnswer ? "#9ca3af" : "#3B82F6", color: "#fff", fontWeight: 500, cursor: savingAnswer ? "not-allowed" : "pointer" }}>
                                                    {savingAnswer ? "저장 중…" : "저장"}
                                                </button>
                                                <button type="button" disabled={savingAnswer} onClick={() => setIsEditingAfterSubmit(false)} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", color: "#374151", cursor: "pointer" }}>
                                                    취소
                                                </button>
                                            </>
                                        ) : (
                                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                                <button type="button" disabled={savingAnswer} onClick={handleSubmitAnswer} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: savingAnswer ? "#9ca3af" : "#3B82F6", color: "#fff", fontWeight: 500, cursor: savingAnswer ? "not-allowed" : "pointer" }}>
                                                    {savingAnswer ? "제출 중…" : "제출하기"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                        <label style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>답안 (Markdown)</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                focusedAnswerTargetRef.current = "single";
                                                imageInputRef.current?.click();
                                            }}
                                            disabled={imageUploading}
                                            style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", color: "#374151", cursor: imageUploading ? "not-allowed" : "pointer" }}
                                        >
                                            🖼️ 이미지 삽입
                                        </button>
                                    </div>
                                    <div
                                        data-color-mode="light"
                                        onFocus={() => { focusedAnswerTargetRef.current = "single"; }}
                                        onPaste={handleAnswerImagePaste("single")}
                                    >
                                        <MDEditor value={answerDraft} onChange={(v) => setAnswerDraft(v ?? "")} height={200} />
                                    </div>
                                    {imageUploading && <span style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>이미지 업로드 중…</span>}
                                    {/* 첨부파일 */}
                                    <div style={{ marginTop: 16, marginBottom: 12 }}>
                                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#374151" }}>첨부파일</div>
                                        {(() => {
                                            const list = parseAttachments(mySub.attachments);
                                            return (
                                                <>
                                                    {(list.length > 0 || pendingAttachmentNames.length > 0) && (
                                                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                                                            {list.map((item, idx) => {
                                                                const fileName = item.name || item.url.split("/").pop() || `첨부파일 ${idx + 1}`;
                                                                const downloadHref = buildAttachmentDownloadUrl(item.url, fileName);
                                                                return (
                                                                    <a key={idx} href={downloadHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#3B82F6" }}>
                                                                        📎 {fileName}
                                                                    </a>
                                                                );
                                                            })}
                                                            {pendingAttachmentNames.map((name, idx) => (
                                                                <span key={`pending-${idx}`} style={{ fontSize: 13, color: "#6b7280" }}>
                                                                    📎 {name} {uploadingAttachments ? "(업로드 중…)" : ""}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <input
                                                        type="file"
                                                        multiple
                                                        disabled={uploadingAttachments}
                                                        onChange={handleAddAttachments}
                                                        style={{ fontSize: 13 }}
                                                    />
                                                    {uploadingAttachments && <span style={{ marginLeft: 8, fontSize: 13, color: "#6b7280" }}>업로드 중…</span>}
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                        {mySub.status === "SUBMITTED" ? (
                                            <>
                                                <button type="button" disabled={savingAnswer} onClick={() => handleSaveDraft({ onSuccess: () => setIsEditingAfterSubmit(false) })} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: savingAnswer ? "#9ca3af" : "#3B82F6", color: "#fff", fontWeight: 500, cursor: savingAnswer ? "not-allowed" : "pointer" }}>
                                                    {savingAnswer ? "저장 중…" : "저장"}
                                                </button>
                                                <button type="button" disabled={savingAnswer} onClick={() => setIsEditingAfterSubmit(false)} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", color: "#374151", cursor: "pointer" }}>
                                                    취소
                                                </button>
                                            </>
                                        ) : (
                                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                                <button type="button" disabled={savingAnswer} onClick={handleSubmitAnswer} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: savingAnswer ? "#9ca3af" : "#3B82F6", color: "#fff", fontWeight: 500, cursor: savingAnswer ? "not-allowed" : "pointer" }}>
                                                    {savingAnswer ? "제출 중…" : "제출하기"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div style={{ padding: 0 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: mySub.status === "GRADED" && mySub.review ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
                                        gap: "24px",
                                        flex: "1 1 auto",
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>등록자</div>
                                        <div style={{ fontSize: "14px", color: "#111827" }}>{user?.name ?? "사용자"}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>등록일시</div>
                                        <div style={{ fontSize: "14px", color: "#111827" }}>{mySub.submittedAt ? formatDateTime(mySub.submittedAt) : "-"}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>상태</div>
                                        <div style={{ fontSize: "14px", color: "#111827" }}>
                                            {mySub.status === "DRAFT" && "임시저장"}
                                            {mySub.status === "SUBMITTED" && "제출완료"}
                                            {mySub.status === "GRADED" && "평가완료"}
                                        </div>
                                    </div>
                                    {mySub.status === "GRADED" && mySub.review && (
                                        <div>
                                            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>총점</div>
                                            <div style={{ fontSize: "14px", color: "#111827", fontWeight: 500 }}>
                                                {mySub.review.score}/{data.maxScore ?? 100}점
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {mySub.status === "SUBMITTED" && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingAfterSubmit(true)}
                                        style={{
                                            padding: "6px 12px",
                                            borderRadius: 6,
                                            border: "1px solid #3B82F6",
                                            background: "#fff",
                                            color: "#3B82F6",
                                            fontSize: 13,
                                            fontWeight: 500,
                                            cursor: "pointer",
                                            flexShrink: 0,
                                        }}
                                    >
                                        수정
                                    </button>
                                )}
                            </div>
                            {displayTasks.length > 0 && (mySub.taskAnswers?.length ?? 0) > 0 ? (
                                displayTasks.map((task, idx) => {
                                    const ta = (mySub.taskAnswers ?? []).find((a) => a.taskId === task.taskId);
                                    const md = ta?.answerMarkdown ?? "";
                                    const tr = mySub.review?.taskReviews?.find((r) => r.taskId === task.taskId);
                                    return (
                                        <div
                                            key={task.taskId}
                                            style={{
                                                marginBottom: idx < displayTasks.length - 1 ? 24 : 0,
                                                padding: 16,
                                                backgroundColor: "var(--app-bg)",
                                                borderRadius: 6,
                                                border: "1px solid #e5e7eb",
                                            }}
                                        >
                                            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 10 }}>{taskLabel(idx, task.title)}</div>
                                            <div style={{ marginBottom: tr ? 12 : 0 }}>
                                                <div className="markdown-preview text-sm" style={{ padding: 12, background: "#fff", borderRadius: 6, border: "1px solid #e5e7eb" }} data-color-mode="light">
                                                    {md.trim() ? <MarkdownPreview components={markdownPreviewImageComponents} source={md} /> : <p style={{ color: "#9ca3af" }}>답안 없음</p>}
                                                </div>
                                            </div>
                                            {mySub.status === "GRADED" && tr && (
                                                <div style={{ padding: 12, background: "#fff", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                                        <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>평가</span>
                                                        <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{tr.score}/{tr.maxScore}점</span>
                                                    </div>
                                                    {tr.feedbackText && <p style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>{tr.feedbackText}</p>}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <>
                                    <div className="markdown-preview" data-color-mode="light">
                                        {(mySub.answerMarkdown ?? "").trim() ? (
                                            <MarkdownPreview components={markdownPreviewImageComponents} source={mySub.answerMarkdown ?? ""} />
                                        ) : (
                                            <p style={{ color: "#6b7280" }}>제출된 답안 내용이 없습니다.</p>
                                        )}
                                    </div>
                                    {mySub.status === "GRADED" && mySub.review && (
                                        <div style={{ marginTop: 12, padding: 12, background: "#fff", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                                            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>평가</div>
                                            <p style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>총점: {mySub.review.score}/{data.maxScore ?? 100}점</p>
                                            {mySub.review.feedbackText && <p style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>{mySub.review.feedbackText}</p>}
                                        </div>
                                    )}
                                </>
                            )}
                            {parseAttachments(mySub.attachments).length > 0 && (
                                <div style={{ marginTop: 12, padding: 12, background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>첨부파일</div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        {parseAttachments(mySub.attachments).map((item, idx) => {
                                            const fileName = item.name || item.url.split("/").pop() || `첨부파일 ${idx + 1}`;
                                            const downloadHref = buildAttachmentDownloadUrl(item.url, fileName);
                                            return (
                                                <a key={idx} href={downloadHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#3B82F6" }}>
                                                    📎 {fileName}
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    </div>
                </section>
            )}

            {/* 모든 답변 목록 (관리자/작성자용) */}
            {canViewAll && (
                <section style={{ marginBottom: "24px" }}>
                    <h2 className="text-lg font-semibold mb-3">모든 답변</h2>
                    {data.allSubmissions && data.allSubmissions.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {data.allSubmissions.map((sub) => (
                            <div key={sub.submissionId} style={{ border: "2px solid #e5e7eb", borderRadius: "8px", padding: "16px", backgroundColor: "#fff" }}>
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: sub.status === "GRADED" && sub.review ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
                                            gap: "24px",
                                            flex: "1 1 auto",
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>등록자</div>
                                            <div style={{ fontSize: "14px", color: "#111827" }}>{sub.submitterName ?? `사용자 ${sub.submitterId}`}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>등록일시</div>
                                            <div style={{ fontSize: "14px", color: "#111827" }}>{sub.submittedAt ? formatDateTime(sub.submittedAt) : "-"}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>상태</div>
                                            <div style={{ fontSize: "14px", color: "#111827" }}>
                                                {sub.status === "DRAFT" && "임시저장"}
                                                {sub.status === "SUBMITTED" && "제출완료"}
                                                {sub.status === "GRADED" && "평가완료"}
                                            </div>
                                        </div>
                                        {sub.status === "GRADED" && sub.review && (
                                            <div>
                                                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>총점</div>
                                                <div style={{ fontSize: "14px", color: "#111827", fontWeight: 500 }}>
                                                    {sub.review.score}/{data.maxScore ?? 100}점
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {isAdmin && sub.status === "GRADED" && editingReviewSubmissionId !== sub.submissionId && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingReviewSubmissionId(sub.submissionId);
                                                if (sub.review?.taskReviews?.length) {
                                                    const bySub: Record<number, { score: number; feedbackText: string }> = {};
                                                    for (const tr of sub.review.taskReviews) {
                                                        bySub[tr.taskId] = { score: tr.score ?? 0, feedbackText: tr.feedbackText ?? "" };
                                                    }
                                                    setPendingReviewBySub((prev) => ({ ...prev, [sub.submissionId]: bySub }));
                                                }
                                            }}
                                            style={{
                                                padding: "6px 12px",
                                                borderRadius: 6,
                                                border: "1px solid #3B82F6",
                                                background: "#fff",
                                                color: "#3B82F6",
                                                fontSize: 13,
                                                fontWeight: 500,
                                                cursor: "pointer",
                                                flexShrink: 0,
                                            }}
                                        >
                                            평가 수정
                                        </button>
                                    )}
                                </div>
                                {displayTasks.length > 0 && (sub.taskAnswers?.length ?? 0) > 0 ? (
                                    <div className="mb-2" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                        {displayTasks.map((task, idx) => {
                                            const ta = (sub.taskAnswers ?? []).find((a) => a.taskId === task.taskId);
                                            const md = ta?.answerMarkdown ?? "";
                                            const tr = sub.review?.taskReviews?.find((r) => r.taskId === task.taskId);
                                            const isEditingThis = isAdmin && (sub.status === "SUBMITTED" || (sub.status === "GRADED" && editingReviewSubmissionId === sub.submissionId));
                                            const draft = (() => {
                                                const bySub = pendingReviewBySub[sub.submissionId];
                                                if (bySub && task.taskId in bySub) return bySub[task.taskId];
                                                if (sub.status === "GRADED" && editingReviewSubmissionId === sub.submissionId && tr)
                                                    return { score: tr.score ?? 0, feedbackText: tr.feedbackText ?? "" };
                                                return { score: 0, feedbackText: "" };
                                            })();
                                            const taskMaxDisplay = task.maxScore > 0 ? task.maxScore : 100;
                                            return (
                                                <div key={task.taskId} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, backgroundColor: "#fff" }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 10 }}>{taskLabel(idx, task.title)}</div>
                                                    <div style={{ marginBottom: 10 }}>
                                                        <div className="markdown-preview text-sm" style={{ padding: 12, background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }} data-color-mode="light">
                                                            {md.trim() ? <MarkdownPreview components={markdownPreviewImageComponents} source={md} /> : <p style={{ color: "#9ca3af" }}>답안 없음</p>}
                                                        </div>
                                                    </div>
                                                    {isEditingThis ? (
                                                        <div style={{ padding: 12, background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                                                <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>평가</span>
                                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        max={10000}
                                                                        value={draft.score ?? 0}
                                                                        onFocus={(e) => e.currentTarget.select()}
                                                                        onChange={(e) => {
                                                                            const v = e.target.value === "" ? 0 : Math.max(0, Math.min(10000, Number(e.target.value)));
                                                                            const safeScore = typeof draft.score === "number" ? draft.score : 0;
                                                                            setPendingReviewBySub((prev) => {
                                                                                const bySub = { ...(prev[sub.submissionId] ?? {}) };
                                                                                bySub[task.taskId] = { ...(bySub[task.taskId] ?? { score: 0, feedbackText: "" }), score: isNaN(v) ? safeScore : v };
                                                                                return { ...prev, [sub.submissionId]: bySub };
                                                                            });
                                                                        }}
                                                                        style={{ width: 72, padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 14 }}
                                                                    />
                                                                    <span style={{ fontSize: 13, color: "#6b7280" }}>/ {taskMaxDisplay}점</span>
                                                                </div>
                                                            </div>
                                                            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>평가 내용</label>
                                                            <textarea
                                                                placeholder="해당 세부 실습에 대한 평가"
                                                                value={draft.feedbackText}
                                                                onChange={(e) =>
                                                                    setPendingReviewBySub((prev) => {
                                                                        const bySub = { ...(prev[sub.submissionId] ?? {}) };
                                                                        bySub[task.taskId] = { ...(bySub[task.taskId] ?? { score: 0, feedbackText: "" }), feedbackText: e.target.value };
                                                                        return { ...prev, [sub.submissionId]: bySub };
                                                                    })
                                                                }
                                                                style={{ width: "100%", minHeight: 72, padding: 10, border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                                                            />
                                                        </div>
                                                    ) : tr ? (
                                                        <div style={{ padding: 12, background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                                                <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>평가</span>
                                                                <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{tr.score}/{tr.maxScore}점</span>
                                                            </div>
                                                            {tr.feedbackText && <p style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>{tr.feedbackText}</p>}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="markdown-preview text-sm border border-gray-200 rounded-lg p-3 bg-gray-50 mb-2" data-color-mode="light">
                                        <MarkdownPreview components={markdownPreviewImageComponents} source={sub.answerMarkdown ?? ""} />
                                        {!sub.answerMarkdown && <p className="text-gray-500">답안 없음</p>}
                                    </div>
                                )}
                                {parseAttachments(sub.attachments).length > 0 && (
                                    <div style={{ marginTop: 8, marginBottom: 8, padding: 8, background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>첨부파일</div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                            {parseAttachments(sub.attachments).map((item, idx) => {
                                                const fileName = item.name || item.url.split("/").pop() || `첨부파일 ${idx + 1}`;
                                                const downloadHref = buildAttachmentDownloadUrl(item.url, fileName);
                                                return (
                                                    <a key={idx} href={downloadHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#3B82F6" }}>
                                                        📎 {fileName}
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {isAdmin && (sub.status === "SUBMITTED" || (sub.status === "GRADED" && editingReviewSubmissionId === sub.submissionId)) && displayTasks.length > 0 && (
                                    <div style={{ marginTop: 12 }}>
                                        <button
                                            type="button"
                                            disabled={saving === `review-${sub.submissionId}`}
                                            onClick={async () => {
                                                const bySub = pendingReviewBySub[sub.submissionId] ?? {};
                                                const items: TaskScoreItem[] = displayTasks.map((t) => {
                                                    const d = bySub[t.taskId] ?? { score: 0, feedbackText: "" };
                                                    return { taskId: t.taskId, score: Math.max(0, Math.min(10000, d.score)), feedbackText: d.feedbackText ?? "" };
                                                });
                                                await handleSaveReview(sub.submissionId, 0, "", items);
                                                setEditingReviewSubmissionId((prev) => (prev === sub.submissionId ? null : prev));
                                                setPendingReviewBySub((prev) => {
                                                    const next = { ...prev };
                                                    delete next[sub.submissionId];
                                                    return next;
                                                });
                                            }}
                                            style={{
                                                padding: "10px 16px",
                                                borderRadius: 6,
                                                border: "none",
                                                background: saving === `review-${sub.submissionId}` ? "#9ca3af" : "#3B82F6",
                                                color: "#fff",
                                                fontWeight: 500,
                                                fontSize: 14,
                                                cursor: saving === `review-${sub.submissionId}` ? "not-allowed" : "pointer",
                                            }}
                                        >
                                            {saving === `review-${sub.submissionId}` ? "저장 중..." : "평가 저장"}
                                        </button>
                                    </div>
                                )}
                                {sub.review && !isAdmin && (
                                    <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                                        평가자: {sub.review.reviewerSummary?.name ?? sub.review.reviewerName ?? "-"}
                                    </div>
                                )}
                                {displayTasks.length === 0 && isAdmin && (sub.status === "SUBMITTED" || (sub.status === "GRADED" && editingReviewSubmissionId === sub.submissionId)) && (
                                    <div className="mt-2">
                                        <ReviewForm
                                            key={sub.submissionId}
                                            submissionId={sub.submissionId}
                                            maxScore={data.maxScore ?? 100}
                                            tasks={displayTasks}
                                            onSave={handleSaveReview}
                                            saving={saving}
                                            initialTaskScores={sub.review?.taskReviews?.map((tr) => ({ taskId: tr.taskId, score: tr.score ?? 0, feedbackText: tr.feedbackText ?? "" }))}
                                            initialScore={sub.review?.score ?? undefined}
                                            initialFeedbackText={sub.review?.feedbackText ?? undefined}
                                        />
                                    </div>
                                )}
                            </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">아직 제출된 답변이 없습니다.</p>
                    )}
                </section>
            )}
        </div>
        <ErrorModal open={!!error} message={error ?? ""} onClose={() => setError(null)} />
        {data && postId != null && (
            <AssignmentRequestFormModal
                open={requestFormModalOpen}
                postId={postId}
                postTitle={data.title ?? ""}
                onClose={() => setRequestFormModalOpen(false)}
            />
        )}
        </>
    );
}

function ReviewForm({
    submissionId,
    maxScore,
    tasks,
    onSave,
    saving,
    initialTaskScores,
    initialScore,
    initialFeedbackText,
}: {
    submissionId: number;
    maxScore: number;
    tasks: AssignmentTaskItem[];
    onSave: (submissionId: number, score: number, feedbackText: string, taskScores?: TaskScoreItem[]) => void;
    saving: string | null;
    initialTaskScores?: Array<{ taskId: number; score: number; feedbackText: string }>;
    initialScore?: number;
    initialFeedbackText?: string;
}) {
    const [score, setScore] = useState(() => initialScore ?? 0);
    const [feedbackText, setFeedbackText] = useState(() => initialFeedbackText ?? "");
    const [taskScores, setTaskScores] = useState<Record<number, { score: number; feedbackText: string }>>(() => {
        const init: Record<number, { score: number; feedbackText: string }> = {};
        if (initialTaskScores && initialTaskScores.length > 0) {
            for (const ts of initialTaskScores) {
                init[ts.taskId] = { score: ts.score, feedbackText: ts.feedbackText ?? "" };
            }
        }
        for (const t of tasks) {
            if (!(t.taskId in init)) init[t.taskId] = { score: 0, feedbackText: "" };
        }
        return init;
    });
    const busy = saving === `review-${submissionId}`;
    const max = Math.max(0, Number(maxScore) || 100);
    const clampedScore = Math.max(0, Math.min(max, score));
    const useTaskScores = tasks.length > 0;

    const handleSubmit = () => {
        if (useTaskScores) {
            const items: TaskScoreItem[] = tasks.map((t) => {
                const s = taskScores[t.taskId] ?? { score: 0, feedbackText: "" };
                return { taskId: t.taskId, score: Math.max(0, Math.min(10000, s.score)), feedbackText: s.feedbackText ?? "" };
            });
            onSave(submissionId, 0, "", items);
        } else {
            onSave(submissionId, clampedScore, feedbackText);
        }
    };

    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "#fff",
            }}
        >
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#111827" }}>평가 자료</h3>
            {useTaskScores ? (
                <>
                    {tasks.map((task) => {
                        const s = taskScores[task.taskId] ?? { score: 0, feedbackText: "" };
                        return (
                            <div key={task.taskId} className="mb-4 pb-4 border-b border-gray-200 last:border-0 last:pb-0 last:mb-0">
                                <div className="text-sm font-medium mb-2" style={{ color: "#374151" }}>{task.title}</div>
                                <div className="flex items-center gap-2 mb-2">
                                    <label className="text-sm" style={{ color: "#6b7280" }}>점수:</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={10000}
                                        value={s.score}
                                        onFocus={(e) => e.currentTarget.select()}
                                        onChange={(e) => {
                                            const v = e.target.value === "" ? 0 : Number(e.target.value);
                                            setTaskScores((prev) => {
                                                const cur = prev[task.taskId] ?? { score: 0, feedbackText: "" };
                                                return {
                                                    ...prev,
                                                    [task.taskId]: { ...cur, score: isNaN(v) ? cur.score : Math.max(0, Math.min(10000, v)) },
                                                };
                                            });
                                        }}
                                        style={{
                                            width: "72px",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: "6px",
                                            padding: "6px 10px",
                                            fontSize: "14px",
                                            backgroundColor: "#fff",
                                            boxSizing: "border-box",
                                        }}
                                    />
                                    <span className="text-sm" style={{ color: "#6b7280" }}>/ {task.maxScore > 0 ? task.maxScore : 100}점</span>
                                </div>
                                <div>
                                    <label className="text-sm block mb-1" style={{ color: "#6b7280" }}>평가 내용</label>
                                    <textarea
                                        style={{
                                            width: "100%",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: "6px",
                                            padding: "10px",
                                            fontSize: "14px",
                                            minHeight: "72px",
                                            backgroundColor: "#fff",
                                            boxSizing: "border-box",
                                        }}
                                        placeholder="해당 세부 실습에 대한 평가"
                                        value={s.feedbackText}
                                        onChange={(e) =>
                                            setTaskScores((prev) => ({
                                                ...prev,
                                                [task.taskId]: { ...prev[task.taskId], feedbackText: e.target.value },
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        );
                    })}
                </>
            ) : (
                <>
                    <div className="flex items-center gap-2 mb-3">
                        <label className="text-sm" style={{ color: "#374151" }}>점수:</label>
                        <input
                            type="number"
                            min={0}
                            max={max}
                            value={score}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) => {
                                const v = e.target.value === "" ? 0 : Number(e.target.value);
                                setScore(isNaN(v) ? score : Math.max(0, Math.min(max, v)));
                            }}
                            onBlur={() => setScore(clampedScore)}
                            style={{
                                width: "80px",
                                border: "1px solid #e5e7eb",
                                borderRadius: "6px",
                                padding: "6px 12px",
                                fontSize: "14px",
                                backgroundColor: "#fff",
                                boxSizing: "border-box",
                            }}
                        />
                        <span className="text-sm" style={{ color: "#6b7280" }}>/{max}점</span>
                    </div>
                    <div className="mb-3">
                        <label className="text-sm block mb-1" style={{ color: "#374151" }}>평가 내용</label>
                        <textarea
                            style={{
                                width: "100%",
                                border: "1px solid #e5e7eb",
                                borderRadius: "6px",
                                padding: "12px",
                                fontSize: "14px",
                                minHeight: "100px",
                                backgroundColor: "#fff",
                                boxSizing: "border-box",
                            }}
                            placeholder="평가 내용을 입력하세요"
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                        />
                    </div>
                </>
            )}
            <button
                type="button"
                onClick={handleSubmit}
                disabled={busy}
                style={{
                    padding: "8px 16px",
                    backgroundColor: busy ? "#9ca3af" : "#3B82F6",
                    color: "#fff",
                    borderRadius: "6px",
                    border: "2px solid",
                    borderColor: busy ? "#9ca3af" : "#3B82F6",
                    fontSize: "14px",
                    cursor: busy ? "not-allowed" : "pointer",
                    fontWeight: 500,
                }}
            >
                {busy ? "저장 중..." : "평가 저장"}
            </button>
        </div>
    );
}
