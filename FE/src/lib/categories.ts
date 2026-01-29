export type CategoryKey = "newbie" | "training" | "incident" | "system";

/**
 * BE에서 내려오는 category 값 (DB enum/string)
 */
export type ApiCategory = "SYSTEM" | "INCIDENT" | "TRAINING";

export const DEFAULT_CATEGORY: CategoryKey = "newbie";

export const NAV_ITEMS: Array<{ key: CategoryKey; label: string }> = [
    { key: "newbie", label: "신입 교육 자료" },
    { key: "training", label: "실습" },
    { key: "incident", label: "장애 지원" },
    { key: "system", label: "업무시스템" },
];

export function isCategoryKey(v: unknown): v is CategoryKey {
    return v === "newbie" || v === "training" || v === "incident" || v === "system";
}

/**
 * 화면 카테고리(key) -> BE category 목록
 * - newbie: 전체(신입 교육 자료는 전체 묶음)
 * - training: TRAINING
 * - incident: INCIDENT
 * - system: SYSTEM
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

export const API_CATEGORY_LABEL: Record<ApiCategory, string> = {
    SYSTEM: "업무시스템",
    INCIDENT: "장애 지원",
    TRAINING: "실습",
};

export function labelOfApiCategory(cat?: string | null): string {
    if (cat === "SYSTEM" || cat === "INCIDENT" || cat === "TRAINING") {
        return API_CATEGORY_LABEL[cat];
    }
    return "기타";
}
