export type CategoryKey = "newbie" | "training" | "incident" | "system";

/**
 * BE에서 내려오는 category 값 (DB enum/string)
 */
export type ApiCategory = "SYSTEM" | "INCIDENT" | "TRAINING";

export const DEFAULT_CATEGORY: CategoryKey = "newbie";

/** 네비용 트리(라벨 매핑) — 단일 진실 소스 */
export const NAV_ITEMS: Array<{ key: CategoryKey; label: string }> = [
    { key: "newbie", label: "신입 교육 자료" },
    { key: "training", label: "실습" },
    { key: "incident", label: "장애 지원" },
    { key: "system", label: "업무시스템" },
];

/** 호환용: CATEGORY_TREE = NAV_ITEMS */
export const CATEGORY_TREE = NAV_ITEMS;

/** 사이드바용: 상위 카테고리 + 하위(들여쓰기) 구조 */
export const SIDEBAR_NAV: Array<{ key: CategoryKey; label: string; indent?: boolean }> = [
    { key: "newbie", label: "신입 교육 자료" },
    { key: "system", label: "업무시스템", indent: true },
    { key: "incident", label: "장애 지원", indent: true },
    { key: "training", label: "실습", indent: true },
];

export const API_CATEGORY_LABEL: Record<ApiCategory, string> = {
    SYSTEM: "업무시스템",
    INCIDENT: "장애 지원",
    TRAINING: "실습",
};

/** 화면 키 → URL/API용 단일 카테고리 (newbie는 전체이므로 제외) */
export const KEY_TO_API_CATEGORY: Record<Exclude<CategoryKey, "newbie">, ApiCategory> = {
    training: "TRAINING",
    incident: "INCIDENT",
    system: "SYSTEM",
};

/** URL cat 값 → 네비 하이라이트용 키 */
export const API_TO_KEY: Record<ApiCategory, CategoryKey> = {
    TRAINING: "training",
    INCIDENT: "incident",
    SYSTEM: "system",
};

export function isCategoryKey(v: unknown): v is CategoryKey {
    return v === "newbie" || v === "training" || v === "incident" || v === "system";
}

export function isApiCategory(v: unknown): v is ApiCategory {
    return v === "SYSTEM" || v === "INCIDENT" || v === "TRAINING";
}

/**
 * BE codeToPostCategory와 동일: code 문자열에 SYSTEM/INCIDENT/TRAINING 포함 여부로 ApiCategory 반환.
 * (예: CAT_SYSTEM → SYSTEM, code 없음 → TRAINING)
 */
export function categoryCodeToApiCategory(code: string | null | undefined): ApiCategory {
    if (code == null || code === "") return "TRAINING";
    const upper = code.toUpperCase();
    if (upper.includes("SYSTEM")) return "SYSTEM";
    if (upper.includes("INCIDENT")) return "INCIDENT";
    if (upper.includes("TRAINING")) return "TRAINING";
    return "TRAINING";
}

/**
 * URL 쿼리 cat 값 → BE categories 배열
 * cat=INCIDENT → [INCIDENT], 없거나 비유효 → 전체 [SYSTEM, INCIDENT, TRAINING]
 */
export function getApiCategoriesFromCatParam(catParam: string | null): ApiCategory[] {
    if (catParam != null && isApiCategory(catParam)) {
        return [catParam];
    }
    return ["SYSTEM", "INCIDENT", "TRAINING"];
}

/**
 * URL cat 값 → 현재 선택된 네비 키 (사이드바 하이라이트)
 */
export function getCurrentCategoryKeyFromCatParam(catParam: string | null): CategoryKey {
    if (catParam != null && isApiCategory(catParam)) {
        return API_TO_KEY[catParam];
    }
    return DEFAULT_CATEGORY;
}
/**
 * 화면 카테고리(key) -> BE category 목록
 * - newbie: 전체
 * - training: TRAINING, incident: INCIDENT, system: SYSTEM
 */
export function getApiCategoriesByKey(key: CategoryKey): ApiCategory[] {
    switch (key) {
        case "training":
            return ["TRAINING"];
        case "incident":
            return ["INCIDENT"];
        case "system":
            return ["SYSTEM"];
        case "newbie":
        default:
            return ["SYSTEM", "INCIDENT", "TRAINING"];
    }
}

/** 호환용: toApiCategories = getApiCategoriesByKey */
export const toApiCategories = getApiCategoriesByKey;

export function labelOfApiCategory(cat?: string | null): string {
    if (cat === "SYSTEM" || cat === "INCIDENT" || cat === "TRAINING") {
        return API_CATEGORY_LABEL[cat];
    }
    return "기타";
}
