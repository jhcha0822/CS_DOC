// src/lib/categories.ts

/** UI에서 쓰는 카테고리 키 (query param 기준) */
export type CategoryKey = "newbie" | "practice" | "incident" | "system";

/** BE(PostCategory) enum 문자열 */
export type ApiCategory = "PRACTICE" | "INCIDENT" | "SYSTEM";

export const DEFAULT_CATEGORY: CategoryKey = "newbie";

const META: Record<CategoryKey, { label: string; children?: CategoryKey[] }> = {
    newbie: { label: "신인 교육 자료", children: ["practice", "incident", "system"] },
    practice: { label: "실습" },
    incident: { label: "장애 지원" },
    system: { label: "업무시스템" },
};

const UI_TO_API: Record<Exclude<CategoryKey, "newbie">, ApiCategory> = {
    practice: "PRACTICE",
    incident: "INCIDENT",
    system: "SYSTEM",
};

/** SideNav에서 쓰는 메뉴 */
export const NAV_ITEMS: Array<{ key: CategoryKey; label: string }> = [
    { key: "newbie", label: META.newbie.label },
    { key: "practice", label: META.practice.label },
    { key: "incident", label: META.incident.label },
    { key: "system", label: META.system.label },
];

export function isCategoryKey(v: unknown): v is CategoryKey {
    return v === "newbie" || v === "practice" || v === "incident" || v === "system";
}

export function labelOf(key: CategoryKey): string {
    return META[key].label;
}

/**
 * UI 선택값을 "하위 포함" UI 키로 확장
 * - newbie -> [practice, incident, system]
 * - practice -> [practice]
 */
export function toFilterKeys(key: CategoryKey): CategoryKey[] {
    return META[key].children ?? [key];
}

/**
 * ✅ UI 선택값을 BE 필터용 enum 배열로 변환
 * - newbie -> [PRACTICE, INCIDENT, SYSTEM]
 * - practice -> [PRACTICE]
 */
export function toApiCategories(key: CategoryKey): ApiCategory[] {
    const keys = toFilterKeys(key).filter((k): k is Exclude<CategoryKey, "newbie"> => k !== "newbie");
    return keys.map((k) => UI_TO_API[k]);
}
