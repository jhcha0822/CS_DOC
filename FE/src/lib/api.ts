import type { ApiCategory } from "./categories";

const API_BASE =
    (import.meta as any).env?.VITE_API_BASE?.toString?.() || "http://localhost:8080";

export type PostListItem = {
    id: number;
    title: string;
    category: ApiCategory;
    createdAt: string;
    updatedAt: string;
};

export type PostListResponse = {
    items: PostListItem[];
};

export type PostDetail = {
    id: number;
    title: string;
    category: ApiCategory;
    createdAt: string;
    updatedAt: string;
};

/**
 * JSON이 아닌 HTML(예: 에러 페이지)로 오는 경우를 잡아내기 위한 공통 fetch
 */
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
            `HTTP ${res.status} ${res.statusText} - ${text?.slice(0, 200) || "no body"}`
        );
    }

    if (!isJson) {
        const text = await res.text().catch(() => "");
        throw new Error(`Unexpected response (not JSON): ${text?.slice(0, 200) || ""}`);
    }

    return (await res.json()) as T;
}

/**
 * 목록 조회
 * - categories를 넘겨도 되고(서버가 지원하면 필터링)
 * - 서버가 무시해도 FE에서 한 번 더 필터링할 거라 안전
 */
export async function fetchPosts(params?: {
    categories?: ApiCategory[];
    q?: string;
}): Promise<PostListResponse> {
    const url = new URL("/api/posts", API_BASE);

    if (params?.categories?.length) {
        // 서버가 categories=SYSTEM&categories=INCIDENT 형태를 받을 수도 있어서 반복 파라미터로 보냄
        params.categories.forEach((c) => url.searchParams.append("categories", c));
    }

    if (params?.q?.trim()) {
        url.searchParams.set("q", params.q.trim());
    }

    return fetchJson<PostListResponse>(url.toString());
}

/**
 * 단건 조회
 */
export async function fetchPost(id: number): Promise<PostDetail> {
    const url = new URL(`/api/posts/${id}`, API_BASE);
    return fetchJson<PostDetail>(url.toString());
}
