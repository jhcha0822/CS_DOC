// src/lib/api.ts
export const API_BASE = "http://localhost:8080";

export type PageResponse<T> = {
    items: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
};

export type PostListItem = {
    id: number;
    title: string;
    category: "PRACTICE" | "INCIDENT" | "SYSTEM";
    createdAt: string;
    updatedAt: string;
};

export async function fetchPosts(params: {
    categories: string[];
    keyword?: string;
    page?: number;
    size?: number;
}): Promise<PageResponse<PostListItem>> {
    const url = new URL(`${API_BASE}/api/posts`);
    params.categories.forEach((c) => url.searchParams.append("categories", c));
    if (params.keyword) url.searchParams.set("keyword", params.keyword);
    if (params.page != null) url.searchParams.set("page", String(params.page));
    if (params.size != null) url.searchParams.set("size", String(params.size));

    const res = await fetch(url.toString());
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json();
}
