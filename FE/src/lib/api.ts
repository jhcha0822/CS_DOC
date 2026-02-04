import type { ApiCategory } from "./categories";

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
    category: ApiCategory;
    createdAt: string;
    updatedAt: string;
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

export type PostDetail = {
    id: number;
    title: string;
    category: ApiCategory;
    createdAt: string;
    updatedAt: string;
    contentMd?: string;
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
 * JSON이 아닌 HTML(예: 에러 페이지)로 오는 경우를 잡아내기 위한 공통 fetch
 */
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
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
 * - BE: keyword(검색어), searchIn(검색범위), categories(반복 파라미터), categoryId(카테고리 ID), page(0-based), size
 */
export async function fetchPosts(params?: {
    categories?: ApiCategory[];
    q?: string;
    searchIn?: SearchIn;
    categoryId?: number;
    page?: number;
    size?: number;
}): Promise<PostListResponse> {
    const url = new URL("/api/posts", API_BASE);

    if (params?.categoryId != null) {
        url.searchParams.set("categoryId", String(params.categoryId));
    } else if (params?.categories?.length) {
        params.categories.forEach((c) => url.searchParams.append("categories", c));
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
 * 이미지 업로드 (Ctrl+V 붙여넣기용). 서버에 저장 후 URL 반환. 본문에는 URL만 저장되어 반응성 유지.
 */
export async function uploadImage(file: File): Promise<{ url: string }> {
    const url = new URL("/api/upload/image", API_BASE);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(url.toString(), {
        method: "POST",
        body: form,
    });
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

export type PostCreatePayload = {
    title: string;
    category?: ApiCategory;
    contentMd: string;
};

export type PostPatchPayload = {
    title?: string;
    category?: ApiCategory;
    markdown?: string;
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
    const body = {
        title: payload.title.trim(),
        category: payload.category ?? "TRAINING",
        contentMd: payload.contentMd,
    };
    const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
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
 * 게시글 수정 (PATCH)
 */
export async function patchPost(
    id: number,
    payload: PostPatchPayload
): Promise<PostResponse> {
    const url = new URL(`/api/posts/${id}`, API_BASE);
    const body: Record<string, unknown> = {};
    if (payload.title !== undefined) body.title = payload.title.trim();
    if (payload.category !== undefined) body.category = payload.category;
    if (payload.markdown !== undefined) body.markdown = payload.markdown;
    const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
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
 * .md 파일로 게시글 생성
 */
export async function createPostByUpload(
    file: File,
    options?: { title?: string; category?: ApiCategory }
): Promise<PostResponse> {
    const url = new URL("/api/posts/upload", API_BASE);
    const form = new FormData();
    form.append("file", file);
    if (options?.title?.trim()) form.append("title", options.title.trim());
    if (options?.category) form.append("category", options.category);

    const res = await fetch(url.toString(), {
        method: "POST",
        body: form,
    });
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
    options?: { title?: string }
): Promise<PostResponse> {
    const url = new URL(`/api/posts/${id}/content/upload`, API_BASE);
    const form = new FormData();
    form.append("file", file);
    if (options?.title?.trim()) form.append("title", options.title.trim());

    const res = await fetch(url.toString(), {
        method: "PUT",
        body: form,
    });
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

// --- Category (관리용, 추후 RBAC 적용) ---

export type CategoryItem = {
    id: number;
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
    const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            label: payload.label.trim(),
            parentId: payload.parentId ?? null,
        }),
    });
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

export async function updateCategory(
    id: number,
    payload: { label?: string; parentId?: number | null }
): Promise<CategoryItem> {
    const url = new URL(`/api/categories/${id}`, API_BASE);
    const body: Record<string, unknown> = {};
    if (payload.label !== undefined) body.label = payload.label.trim();
    if (payload.parentId !== undefined) body.parentId = payload.parentId;
    const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
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
    const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
    });
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
    const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            `HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`,
            res.status,
            text
        );
    }
}
