function getApiBase(): string {
    const env = (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE?.toString?.();
    if (env) return env;
    if (typeof window !== "undefined") return window.location.origin;
    return "http://localhost:8080";
}
const API_BASE = getApiBase();

export type PostListItem = {
    id: number;
    title: string;
    category: string | null; // Deprecated: 기존 데이터 호환성을 위해 유지
    categoryId: number | null;
    isNotice: boolean | null;
    viewCount: number | null;
    attachments: string | null; // JSON array of attachment URLs
    createdAt: string;
    updatedAt: string;
    updatedByName: string | null; // 최종 수정자 이름
    commentCount: number | null; // 댓글 수
    postKind?: string | null; // DOC | ASSIGNMENT
};

export type PostListResponse = {
    items: PostListItem[];
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
};

export type PostDetailAssignmentTask = {
    taskId: number;
    title: string;
    descriptionMarkdown: string;
    sortOrder: number;
    maxScore: number;
};

export type PostDetail = {
    id: number;
    title: string;
    summaryTitle?: string | null;
    category: string | null; // Deprecated: 기존 데이터 호환성을 위해 유지
    categoryId: number | null;
    isNotice: boolean | null;
    viewCount: number | null;
    attachments: string | null; // JSON array of attachment URLs
    createdAt: string;
    updatedAt: string;
    contentMd?: string;
    updatedByName: string | null; // 최종 수정자 이름
    versionNumber?: number | null;
    postKind?: string | null; // DOC | ASSIGNMENT
    maxScore?: number | null;
    assignmentTasks?: PostDetailAssignmentTask[] | null;
};

export type PostContentResponse = {
    markdown: string;
};

export class ApiError extends Error {
    status: number;
    body?: string;
    constructor(message: string, status: number, body?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.body = body;
    }
}

/**
 * 인증 헤더를 추가한 RequestInit 반환
 */
function addAuthHeader(init?: RequestInit): RequestInit {
    const headers = new Headers(init?.headers);
    if (typeof window !== "undefined") {
        const userStr = localStorage.getItem("cs_doc_user");
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user?.id) {
                    headers.set("X-User-Id", String(user.id));
                }
            } catch {
                // 무시
            }
        }
    }
    return {
        ...init,
        headers: headers,
    };
}

/**
 * JSON이 아닌 HTML(예: 에러 페이지)로 오는 경우를 잡아내기 위한 공통 fetch
 */
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, addAuthHeader(init));
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
        // 401 Unauthorized인 경우 로그인 페이지로 리다이렉트
        if (res.status === 401) {
            if (typeof window !== "undefined") {
                window.location.href = "/login";
            }
        }
        const body = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${body ? ` - ${body.slice(0, 200)}` : ""}`,
            res.status,
            body
        );
    }

    if (!isJson) {
        const body = await res.text().catch(() => "");
        throw new ApiError(
            `Unexpected response (not JSON)${body ? `: ${body.slice(0, 200)}` : ""}`,
            res.status,
            body
        );
    }

    return (await res.json()) as T;
}

/**
 * 검색 범위: 제목 / 내용 / 작성자 / 모두포함
 */
export type SearchIn = "title" | "content" | "author" | "all";

/**
 * 목록 조회
 * - BE: keyword(검색어), searchIn(검색범위), categoryId(카테고리 ID), page(0-based), size
 */
export async function fetchPosts(params?: {
    q?: string;
    searchIn?: SearchIn;
    categoryId?: number;
    page?: number;
    size?: number;
}): Promise<PostListResponse> {
    const url = new URL("/api/posts", API_BASE);

    if (params?.categoryId != null) {
        url.searchParams.set("categoryId", String(params.categoryId));
    }

    if (params?.q?.trim()) {
        url.searchParams.set("keyword", params.q.trim());
    }

    if (params?.searchIn && params.searchIn !== "title") {
        url.searchParams.set("searchIn", params.searchIn);
    }

    if (params?.page != null && params.page >= 0) {
        url.searchParams.set("page", String(params.page));
    }
    if (params?.size != null && params.size > 0) {
        url.searchParams.set("size", String(params.size));
    }

    const data = await fetchJson<PostListResponse>(url.toString());
    return data;
}

/**
 * 단건 조회 (메타 + 본문, 본문은 FE에서 사용하지 않아도 됨)
 * contentMdPath가 null이면 BE에서 500 발생 가능 → 에러 UI로 처리
 */
export async function fetchPost(id: number): Promise<PostDetail> {
    const url = new URL(`/api/posts/${id}`, API_BASE);
    return fetchJson<PostDetail>(url.toString());
}

/**
 * 조회수 증가 (별도 호출)
 */
export async function incrementViewCount(id: number): Promise<void> {
    const url = new URL(`/api/posts/${id}/view`, API_BASE);
    const res = await fetch(url.toString(), addAuthHeader({
        method: "POST",
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
}

/**
 * 이미지 업로드 (Ctrl+V 붙여넣기용). 서버에 저장 후 URL 반환. 본문에는 URL만 저장되어 반응성 유지.
 */
export async function uploadImage(file: File): Promise<{ url: string }> {
    const url = new URL("/api/upload/image", API_BASE);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(url.toString(), addAuthHeader({
        method: "POST",
        body: form,
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
    return res.json() as Promise<{ url: string }>;
}

/**
 * 본문만 조회 (lazy용)
 */
export async function fetchPostContent(id: number): Promise<PostContentResponse> {
    const url = new URL(`/api/posts/${id}/content`, API_BASE);
    return fetchJson<PostContentResponse>(url.toString());
}

export type PostTaskItemInput = {
    taskId?: number | null;
    title: string;
    descriptionMarkdown?: string;
    sortOrder: number;
    maxScore: number;
};

/** 게시글 등록/수정 시 세부 실습 입력용. PostTaskItemInput과 동일 */
export type AssignmentTaskItemInput = PostTaskItemInput;

export type PostCreatePayload = {
    title: string;
    summaryTitle?: string | null;
    categoryId: number;
    contentMd: string;
    isNotice?: boolean;
    postKind?: string | null;
    maxScore?: number | null;
    attachments?: File[];
    userId?: number;
    tasks?: PostTaskItemInput[];
};

export type PostPatchPayload = {
    title?: string;
    summaryTitle?: string | null;
    categoryId?: number;
    markdown?: string;
    isNotice?: boolean;
    maxScore?: number | null;
    attachments?: File[];
    userId?: number;
    tasks?: PostTaskItemInput[];
};

export type PostResponse = {
    id: number;
    title: string;
    createdAt: string;
    updatedAt: string;
};

/**
 * 게시글 생성
 */
export async function createPost(payload: PostCreatePayload): Promise<PostResponse> {
    const url = new URL("/api/posts", API_BASE);
    const body: Record<string, unknown> = {
        title: payload.title.trim(),
        categoryId: payload.categoryId,
        contentMd: payload.contentMd,
    };
    if (payload.summaryTitle !== undefined) body.summaryTitle = payload.summaryTitle;
    if (payload.isNotice !== undefined) body.isNotice = payload.isNotice;
    if (payload.postKind != null && payload.postKind !== "") body.postKind = payload.postKind;
    if (payload.maxScore != null) body.maxScore = payload.maxScore;
    if (payload.tasks !== undefined && payload.tasks.length > 0) {
        body.tasks = payload.tasks.map((t: PostTaskItemInput) => ({
            taskId: t.taskId ?? null,
            title: t.title,
            descriptionMarkdown: t.descriptionMarkdown ?? "",
            sortOrder: t.sortOrder,
            maxScore: t.maxScore,
        }));
    }
    if (payload.userId !== undefined) body.userId = payload.userId;
    const res = await fetch(url.toString(), addAuthHeader({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
    const created = await res.json() as PostResponse;
    
    // 첨부파일이 있으면 별도로 업로드
    if (payload.attachments && payload.attachments.length > 0) {
        await addAttachmentsToPost(created.id, payload.attachments);
    }
    
    return created;
}

/**
 * 게시글에 첨부파일 추가
 */
export async function addAttachmentsToPost(id: number, attachments: File[]): Promise<void> {
    const url = new URL(`/api/posts/${id}/attachments`, API_BASE);
    const form = new FormData();
    attachments.forEach((att) => form.append("attachments", att));

    const res = await fetch(url.toString(), addAuthHeader({
        method: "POST",
        body: form,
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
}

/**
 * 게시글 삭제 (soft delete)
 */
export async function deletePost(id: number): Promise<void> {
    const url = new URL(`/api/posts/${id}`, API_BASE);
    const res = await fetch(url.toString(), addAuthHeader({
        method: "DELETE",
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
}

// --- Assignment (실습) ---

export type AssignmentTaskItem = {
    taskId: number;
    title: string;
    descriptionMarkdown: string;
    sortOrder: number;
    maxScore: number;
};

export type AssignmentTaskAnswerItem = { taskId: number; answerMarkdown: string };

export type AssignmentMemberSummary = {
    memberId: number;
    username: string;
    name: string;
};

export type AssignmentTaskReviewItem = {
    taskId: number;
    score: number | null;
    maxScore: number;
    feedbackText: string | null;
};

export type AssignmentReviewItem = {
    score: number | null;
    feedbackText: string | null;
    reviewerId: number | null;
    reviewerName: string | null;
    reviewerSummary: AssignmentMemberSummary | null;
    reviewedAt: string | null;
    taskReviews: AssignmentTaskReviewItem[] | null;
};

export type AssignmentMySubmissionItem = {
    submissionId: number;
    status: string;
    answerMarkdown: string | null;
    taskAnswers: AssignmentTaskAnswerItem[] | null;
    attachments: string | null;
    submittedAt: string | null;
    gradedAt: string | null;
    review: AssignmentReviewItem | null;
};

export type AssignmentSubmissionItem = {
    submissionId: number;
    submitterId: number;
    submitterName: string;
    submitterSummary: AssignmentMemberSummary | null;
    status: string;
    answerMarkdown: string | null;
    taskAnswers: AssignmentTaskAnswerItem[] | null;
    attachments: string | null;
    submittedAt: string | null;
    gradedAt: string | null;
    review: AssignmentReviewItem | null;
};

export type AssignmentPageResponse = {
    postId: number;
    title: string;
    summaryTitle: string | null;
    categoryId: number | null;
    categoryLabel: string | null;
    createdBy: number | null;
    createdByName: string | null;
    createdAt: string;
    dueAt: string | null;
    maxScore: number | null;
    problemMarkdown: string | null;
    postAttachments: string | null;
    tasks: AssignmentTaskItem[];
    mySubmission: AssignmentMySubmissionItem | null;
    allSubmissions: AssignmentSubmissionItem[];
};

export type TaskScoreItem = {
    taskId: number;
    score: number;
    feedbackText?: string | null;
};

function normalizeReviewItem(r: AssignmentReviewItem | null | undefined): AssignmentReviewItem | null {
    if (!r) return null;
    return {
        ...r,
        taskReviews: r.taskReviews ?? null,
    };
}

export async function fetchAssignmentPage(postId: number): Promise<AssignmentPageResponse | null> {
    const url = new URL(`/api/posts/${postId}/assignment-page`, API_BASE);
    const res = await fetch(url.toString(), addAuthHeader());
    if (!res.ok) {
        if (res.status === 404) return null;
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
    const raw = (await res.json()) as AssignmentPageResponse;
    if (raw.mySubmission?.review) {
        raw.mySubmission.review = normalizeReviewItem(raw.mySubmission.review) as AssignmentReviewItem;
    }
    raw.allSubmissions?.forEach((s) => {
        if (s.review) s.review = normalizeReviewItem(s.review) as AssignmentReviewItem;
    });
    return raw;
}

export async function createMySubmission(postId: number): Promise<void> {
    const url = new URL(`/api/posts/${postId}/submissions/me`, API_BASE);
    const res = await fetch(url.toString(), addAuthHeader({ method: "POST" }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
}

export async function putSubmissionAnswer(
    submissionId: number,
    markdown: string,
    taskId?: number
): Promise<void> {
    const url = new URL(`/api/submissions/${submissionId}/answer`, API_BASE);
    const body: { taskId?: number; markdown: string } = { markdown };
    if (taskId != null) body.taskId = taskId;
    const res = await fetch(url.toString(), addAuthHeader({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
}

export async function submitSubmission(submissionId: number): Promise<void> {
    const url = new URL(`/api/submissions/${submissionId}/submit`, API_BASE);
    const res = await fetch(url.toString(), addAuthHeader({ method: "POST" }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
}

export async function addSubmissionAttachments(submissionId: number, files: File[]): Promise<void> {
    const url = new URL(`/api/submissions/${submissionId}/attachments`, API_BASE);
    const form = new FormData();
    files.forEach((f) => form.append("attachments", f));
    const res = await fetch(url.toString(), addAuthHeader({
        method: "POST",
        body: form,
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
}

export async function saveReview(
    submissionId: number,
    score?: number,
    feedbackText?: string | null,
    taskScores?: TaskScoreItem[] | null
): Promise<void> {
    const url = new URL(`/api/admin/submissions/${submissionId}/review`, API_BASE);
    const body: Record<string, unknown> = {};
    if (score != null) body.score = score;
    if (feedbackText !== undefined) body.feedbackText = feedbackText ?? null;
    if (taskScores != null && taskScores.length > 0) {
        body.taskScores = taskScores.map((t) => ({
            taskId: t.taskId,
            score: t.score,
            feedbackText: t.feedbackText ?? null,
        }));
    }
    const res = await fetch(url.toString(), addAuthHeader({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
}

export type PostVersion = {
    id: number;
    postId: number;
    versionNumber: number;
    title: string | null;
    contentMd: string;
    createdBy: number | null; // 사용자 ID
    createdByName: string | null; // 사용자 이름
    createdAt: string;
};

/**
 * 게시글의 모든 버전 조회
 */
export async function getPostVersions(postId: number): Promise<PostVersion[]> {
    const url = new URL(`/api/posts/${postId}/versions`, API_BASE);
    const res = await fetch(url.toString(), addAuthHeader());
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
    return res.json();
}

/**
 * 특정 버전 조회
 */
export async function getPostVersion(postId: number, versionNumber: number): Promise<PostVersion> {
    const url = new URL(`/api/posts/${postId}/versions/${versionNumber}`, API_BASE);
    const res = await fetch(url.toString(), addAuthHeader());
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
    return res.json();
}

/**
 * 삭제된 게시글 목록 조회
 */
export async function listDeletedPosts(keyword?: string, postId?: number, page?: number, size?: number): Promise<PostListResponse> {
    const url = new URL("/api/posts/deleted", API_BASE);
    if (keyword) url.searchParams.set("keyword", keyword);
    if (postId) url.searchParams.set("postId", postId.toString());
    if (page !== undefined) url.searchParams.set("page", page.toString());
    if (size !== undefined) url.searchParams.set("size", size.toString());
    
    return fetchJson<PostListResponse>(url.toString());
}

/**
 * 삭제 이력 조회
 */
export async function getDeletionHistory(): Promise<PostListItem[]> {
    const url = new URL("/api/posts/deleted/history", API_BASE);
    return fetchJson<PostListItem[]>(url.toString());
}

export type ChangeHistoryItem = {
    postId: number;
    postTitle: string;
    category: string | null;
    categoryId: number | null;
    changeType: "생성" | "수정" | "삭제";
    changeDate: string;
    changedBy: string | null;
    versionNumber: number | null;
    attachments: string | null;
};

/**
 * 전체 변경 이력 조회
 */
export type ChangeHistoryListResponse = {
    items: ChangeHistoryItem[];
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
};

export async function getAllChangeHistory(
    changeType?: "생성" | "수정" | "삭제",
    page?: number,
    size?: number,
    keyword?: string,
    postId?: number
): Promise<ChangeHistoryListResponse> {
    const url = new URL("/api/posts/changes/history", API_BASE);
    if (changeType) url.searchParams.set("changeType", changeType);
    if (page !== undefined) url.searchParams.set("page", page.toString());
    if (size !== undefined) url.searchParams.set("size", size.toString());
    if (keyword) url.searchParams.set("keyword", keyword);
    if (postId !== undefined) url.searchParams.set("postId", postId.toString());
    
    return fetchJson<ChangeHistoryListResponse>(url.toString());
}

/**
 * 특정 게시글의 변경 이력 전체 조회 (삭제된 게시글 포함).
 * getAllChangeHistory의 postId 필터를 사용하여 조회.
 */
export async function getChangeHistoryForPost(postId: number): Promise<ChangeHistoryItem[]> {
    const result = await getAllChangeHistory(undefined, 0, 9999, undefined, postId);
    return result.items ?? [];
}

/**
 * 게시글 수정 (PATCH)
 */
export async function patchPost(
    id: number,
    payload: PostPatchPayload
): Promise<PostResponse> {
    const url = new URL(`/api/posts/${id}`, API_BASE);
    const body: Record<string, unknown> = {};
    if (payload.title !== undefined) body.title = payload.title.trim();
    if (payload.summaryTitle !== undefined) body.summaryTitle = payload.summaryTitle;
    if (payload.categoryId !== undefined) body.categoryId = payload.categoryId;
    if (payload.markdown !== undefined) body.markdown = payload.markdown;
    if (payload.isNotice !== undefined) body.isNotice = payload.isNotice;
    if (payload.maxScore !== undefined) body.maxScore = payload.maxScore;
    if (payload.tasks !== undefined) {
        body.tasks = payload.tasks.map((t: PostTaskItemInput) => ({
            taskId: t.taskId ?? null,
            title: t.title,
            descriptionMarkdown: t.descriptionMarkdown ?? "",
            sortOrder: t.sortOrder,
            maxScore: t.maxScore,
        }));
    }
    if (payload.userId !== undefined) body.userId = payload.userId;
    const res = await fetch(url.toString(), addAuthHeader({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
    const updated = await res.json() as PostResponse;
    
    // 첨부파일이 있으면 별도로 추가
    if (payload.attachments && payload.attachments.length > 0) {
        await addAttachmentsToPost(id, payload.attachments);
    }
    
    return updated;
}

/**
 * .md 파일로 게시글 생성
 */
export async function createPostByUpload(
    file: File,
    options?: { title?: string; categoryId: number; isNotice?: boolean; postKind?: string; images?: File[]; attachments?: File[]; userId?: number }
): Promise<PostResponse> {
    const url = new URL("/api/posts/upload", API_BASE);
    const form = new FormData();
    form.append("file", file);
    if (options?.title?.trim()) form.append("title", options.title.trim());
    if (options?.categoryId != null && options.categoryId > 0) form.append("categoryId", String(options.categoryId));
    if (options?.isNotice !== undefined) {
        form.append("isNotice", String(options.isNotice));
    }
    if (options?.postKind) form.append("postKind", options.postKind);
    if (options?.userId != null) {
        form.append("userId", String(options.userId));
    }
    
    if (options?.images) {
        options.images.forEach((img) => form.append("images", img));
    }
    
    if (options?.attachments) {
        options.attachments.forEach((att) => form.append("attachments", att));
    }

    const res = await fetch(url.toString(), addAuthHeader({
        method: "POST",
        body: form,
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
    return res.json() as Promise<PostResponse>;
}

/**
 * .md 파일로 본문 교체
 */
export async function updateContentByUpload(
    id: number,
    file: File,
    options?: { title?: string; images?: File[]; attachments?: File[]; userId?: number }
): Promise<PostResponse> {
    const url = new URL(`/api/posts/${id}/content/upload`, API_BASE);
    const form = new FormData();
    form.append("file", file);
    if (options?.title?.trim()) form.append("title", options.title.trim());
    if (options?.userId != null) {
        form.append("userId", String(options.userId));
    }
    if (options?.images) {
        options.images.forEach((img) => form.append("images", img));
    }
    if (options?.attachments) {
        options.attachments.forEach((att) => form.append("attachments", att));
    }

    const res = await fetch(url.toString(), addAuthHeader({
        method: "PUT",
        body: form,
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
    return res.json() as Promise<PostResponse>;
}

// --- Memo (가벼운 팁/메모, post와 별도) ---

export type MemoListItem = {
    id: number;
    title: string;
    bodyPreview: string;
    createdAt: string;
    updatedAt: string;
    updatedByName: string | null; // 최종 수정자 이름
};

export type MemoDetail = {
    id: number;
    title: string;
    body: string;
    images: string | null; // JSON array [{"url":"...","name":"..."}]
    createdAt: string;
    updatedAt: string;
    updatedByName: string | null; // 최종 수정자 이름
};

export type MemoListResponse = {
    items: MemoListItem[];
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
};

export async function fetchMemos(params?: { keyword?: string; page?: number; size?: number }): Promise<MemoListResponse> {
    const url = new URL("/api/memos", API_BASE);
    if (params?.keyword?.trim()) url.searchParams.set("keyword", params.keyword.trim());
    if (params?.page != null) url.searchParams.set("page", String(params.page));
    if (params?.size != null) url.searchParams.set("size", String(params.size));
    return fetchJson<MemoListResponse>(url.toString());
}

export async function fetchMemo(id: number): Promise<MemoDetail> {
    const url = new URL(`/api/memos/${id}`, API_BASE);
    return fetchJson<MemoDetail>(url.toString());
}

export async function createMemo(payload: { title: string; body?: string; images?: string; userId?: number }): Promise<MemoDetail> {
    const url = new URL("/api/memos", API_BASE);
    const body: Record<string, unknown> = {
        title: payload.title.trim(),
        body: payload.body ?? "",
        images: payload.images ?? "[]",
    };
    if (payload.userId !== undefined) {
        body.userId = payload.userId;
    }
    const res = await fetch(url.toString(), addAuthHeader({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
    return res.json() as Promise<MemoDetail>;
}

export async function updateMemo(
    id: number,
    payload: { title?: string; body?: string; images?: string; userId?: number }
): Promise<MemoDetail> {
    const url = new URL(`/api/memos/${id}`, API_BASE);
    const body: Record<string, unknown> = {};
    if (payload.title !== undefined) body.title = payload.title.trim();
    if (payload.body !== undefined) body.body = payload.body;
    if (payload.images !== undefined) body.images = payload.images;
    if (payload.userId !== undefined) body.userId = payload.userId;
    const res = await fetch(url.toString(), addAuthHeader({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
    return res.json() as Promise<MemoDetail>;
}

export async function deleteMemo(id: number): Promise<void> {
    const url = new URL(`/api/memos/${id}`, API_BASE);
    const res = await fetch(url.toString(), addAuthHeader({ method: "DELETE" }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
}

// --- Category (관리용, 추후 RBAC 적용) ---

export type CategoryItem = {
    id: number;
    code: string | null;
    label: string;
    parentId: number | null;
    parentLabel: string | null;
    depth: number;
    sortOrder: number;
};

export type CategoryBulkUpdateItem = {
    id: number;
    label: string;
    parentId: number | null;
    depth: number;
    sortOrder: number;
};

export type UserItem = {
    id: number;
    username: string;
    name: string;
    role: "ADMIN" | "USER";
};

export type UserCreatePayload = {
    username: string;
    password: string;
    name: string;
    role: "ADMIN" | "USER";
};

export type UserUpdatePayload = {
    password?: string;
    name?: string;
    role: "ADMIN" | "USER";
};

export async function fetchUsers(): Promise<UserItem[]> {
    const url = new URL("/api/users", API_BASE);
    // 로그인 페이지에서 사용하므로 인증 헤더 없이 호출
    const res = await fetch(url.toString());
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
    return res.json() as Promise<UserItem[]>;
}

export async function fetchUser(id: number): Promise<UserItem> {
    const url = new URL(`/api/users/${id}`, API_BASE);
    const data = await fetchJson<UserItem>(url.toString());
    return data;
}

export async function createUser(payload: UserCreatePayload): Promise<UserItem> {
    const url = new URL("/api/users", API_BASE);
    const data = await fetchJson<UserItem>(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return data;
}

export async function updateUser(id: number, payload: UserUpdatePayload): Promise<UserItem> {
    const url = new URL(`/api/users/${id}`, API_BASE);
    const data = await fetchJson<UserItem>(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return data;
}

export async function deleteUser(id: number): Promise<void> {
    const url = new URL(`/api/users/${id}`, API_BASE);
    await fetchJson<void>(url.toString(), {
        method: "DELETE",
    });
}

export async function fetchCategories(): Promise<CategoryItem[]> {
    const url = new URL("/api/categories", API_BASE);
    try {
        return await fetchJson<CategoryItem[]>(url.toString());
    } catch (e) {
        console.error("fetchCategories error:", e);
        throw e;
    }
}

export async function createCategory(payload: { label: string; parentId?: number | null }): Promise<CategoryItem> {
    const url = new URL("/api/categories", API_BASE);
    const res = await fetch(url.toString(), addAuthHeader({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            label: payload.label.trim(),
            parentId: payload.parentId ?? null,
        }),
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
    return res.json() as Promise<CategoryItem>;
}

export async function deleteCategory(id: number): Promise<void> {
    const url = new URL(`/api/categories/${id}`, API_BASE);
    const res = await fetch(url.toString(), addAuthHeader({ method: "DELETE" }));
    if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        let message = "";
        if (contentType.includes("application/json")) {
            try {
                const data = (await res.json()) as { message?: string };
                message = data.message || "";
            } catch {
                message = await res.text().catch(() => "");
            }
        } else {
            message = await res.text().catch(() => "");
        }
        throw new ApiError(message || `HTTP ${res.status} ${res.statusText}`, res.status, message);
    }
}

export async function updateCategory(
    id: number,
    payload: { label?: string; parentId?: number | null }
): Promise<CategoryItem> {
    const url = new URL(`/api/categories/${id}`, API_BASE);
    const body: Record<string, unknown> = {};
    if (payload.label !== undefined) body.label = payload.label.trim();
    if (payload.parentId !== undefined) body.parentId = payload.parentId;
    const res = await fetch(url.toString(), addAuthHeader({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
    return res.json() as Promise<CategoryItem>;
}

export async function bulkUpdateCategories(items: CategoryBulkUpdateItem[]): Promise<void> {
    const url = new URL("/api/categories/bulk", API_BASE);
    const res = await fetch(url.toString(), addAuthHeader({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
    }));
    if (!res.ok) {
        let errorText = "";
        try {
            const json = await res.json();
            errorText = json.message || JSON.stringify(json);
        } catch {
            errorText = await res.text().catch(() => "");
        }
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${errorText ? ` - ${errorText.slice(0, 200)}` : ""}`,
            res.status,
            errorText
        );
    }
}

export async function reorderCategories(orderedIds: number[]): Promise<void> {
    const url = new URL("/api/categories/reorder", API_BASE);
    const res = await fetch(url.toString(), addAuthHeader({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
}

// --- Comment (댓글) ---

export type Comment = {
    id: number;
    postId: number;
    content: string;
    createdBy: number | null;
    createdByName: string | null;
    updatedBy: number | null;
    updatedByName: string | null;
    createdAt: string;
    updatedAt: string;
};

export async function getComments(postId: number): Promise<Comment[]> {
    const url = new URL(`/api/comments/post/${postId}`, API_BASE);
    return fetchJson<Comment[]>(url.toString());
}

export async function createComment(postId: number, content: string, userId?: number): Promise<Comment> {
    const url = new URL("/api/comments", API_BASE);
    const body: Record<string, unknown> = {
        postId,
        content: content.trim(),
    };
    if (userId !== undefined) {
        body.userId = userId;
    }
    return fetchJson<Comment>(url.toString(), addAuthHeader({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }));
}

export async function updateComment(id: number, content: string, userId?: number): Promise<Comment> {
    const url = new URL(`/api/comments/${id}`, API_BASE);
    const body: Record<string, unknown> = {
        content: content.trim(),
    };
    if (userId !== undefined) {
        body.userId = userId;
    }
    return fetchJson<Comment>(url.toString(), addAuthHeader({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }));
}

export async function deleteComment(id: number): Promise<void> {
    const url = new URL(`/api/comments/${id}`, API_BASE);
    const res = await fetch(url.toString(), addAuthHeader({
        method: "DELETE",
    }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
}
