export const CATEGORY_TREE = {
    key: "newbie",
    label: "신인 교육 자료",
    children: [
        { key: "practice", label: "실습" },
        { key: "incident", label: "장애 지원" },
        { key: "system", label: "업무시스템" },
    ],
} as const;

export type CategoryKey =
    | typeof CATEGORY_TREE["key"]
    | (typeof CATEGORY_TREE["children"])[number]["key"];

export const DEFAULT_CATEGORY: CategoryKey = "newbie";

export function isCategoryKey(v: string | null | undefined): v is CategoryKey {
    if (!v) return false;
    if (v === CATEGORY_TREE.key) return true;
    return CATEGORY_TREE.children.some((c) => c.key === v);
}

// ✅ 핵심: 상위를 누르면 하위 전체를 의미하므로 "선택된 카테고리"를 실제 필터 키 배열로 변환
export function toFilterKeys(category: CategoryKey): string[] {
    if (category === CATEGORY_TREE.key) return CATEGORY_TREE.children.map((c) => c.key);
    return [category];
}

export function labelOf(category: CategoryKey): string {
    if (category === CATEGORY_TREE.key) return CATEGORY_TREE.label;
    return CATEGORY_TREE.children.find((c) => c.key === category)?.label ?? category;
}
