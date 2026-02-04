import { useCallback, useEffect, useMemo, useState } from "react";
import {
    bulkUpdateCategories,
    createCategory,
    fetchCategories,
    type CategoryBulkUpdateItem,
    type CategoryItem,
} from "../lib/api";

export default function CategoryManagePage() {
    const [originalItems, setOriginalItems] = useState<CategoryItem[]>([]);
    const [items, setItems] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newLabel, setNewLabel] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await fetchCategories();
            setOriginalItems(list || []);
            setItems(list || []);
            setHasChanges(false);
            setSelectedId(null);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "목록을 불러오지 못했습니다.";
            console.error("Failed to load categories:", e);
            setError(`에러: ${errorMessage}`);
            setItems([]);
            setOriginalItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const label = newLabel.trim();
        if (!label) return;
        setSubmitting(true);
        setError(null);
        try {
            // 선택된 카테고리가 있고, 그것이 상위 카테고리(depth === 0)이면 그 하위로 추가
            // 선택된 카테고리가 없거나 하위 카테고리면 상위 카테고리로 추가
            let parentId: number | null = null;
            if (selectedId) {
                const selected = items.find((c) => c.id === selectedId);
                if (selected && selected.depth === 0) {
                    parentId = selectedId;
                }
            }
            await createCategory({ label, parentId });
            setNewLabel("");
            await load();
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "추가에 실패했습니다.";
            console.error("Failed to create category:", e);
            setError(`에러: ${errorMessage}`);
        } finally {
            setSubmitting(false);
        }
    };

    const sortedItems = useMemo(() => {
        // 계층 구조를 유지하면서 정렬
        // 1. 상위 카테고리들(depth === 0)을 sortOrder로 정렬
        const topLevel = items
            .filter((c) => c.depth === 0)
            .sort((a, b) => a.sortOrder - b.sortOrder);
        
        // 2. 각 상위 카테고리 아래에 하위 카테고리들을 배치
        const result: CategoryItem[] = [];
        
        for (const parent of topLevel) {
            result.push(parent);
            
            // 해당 상위 카테고리의 하위 카테고리들을 sortOrder로 정렬하여 추가
            const children = items
                .filter((c) => c.parentId === parent.id)
                .sort((a, b) => a.sortOrder - b.sortOrder);
            
            result.push(...children);
        }
        
        // 3. parentId가 null이 아니지만 상위 카테고리가 없는 경우 처리 (orphan 카테고리)
        const orphans = items.filter(
            (c) => c.depth > 0 && !items.some((p) => p.id === c.parentId)
        );
        result.push(...orphans);
        
        return result;
    }, [items]);

    const getTopLevelCategories = useCallback(() => {
        return sortedItems.filter((c) => c.depth === 0);
    }, [sortedItems]);

    const getChildrenOf = useCallback((parentId: number) => {
        return sortedItems.filter((c) => c.parentId === parentId);
    }, [sortedItems]);

    const recalculateSortOrders = (updatedItems: CategoryItem[]) => {
        // 1. 상위 카테고리들(depth === 0)을 sortOrder로 정렬
        const topLevel = updatedItems
            .filter((c) => c.depth === 0)
            .sort((a, b) => a.sortOrder - b.sortOrder);
        
        // 2. 각 상위 카테고리별로 하위 카테고리들을 정렬
        const result: CategoryItem[] = [];
        let globalOrder = 0;
        
        for (const parent of topLevel) {
            // 상위 카테고리 추가
            result.push({ ...parent, sortOrder: globalOrder++ });
            
            // 해당 상위 카테고리의 하위 카테고리들 추가
            const children = updatedItems
                .filter((c) => c.parentId === parent.id)
                .sort((a, b) => a.sortOrder - b.sortOrder);
            
            for (const child of children) {
                result.push({ ...child, sortOrder: globalOrder++ });
            }
        }
        
        // 3. parentId가 null이 아니지만 상위 카테고리가 없는 경우 처리 (orphan 카테고리)
        const orphans = updatedItems.filter(
            (c) => c.depth > 0 && !updatedItems.some((p) => p.id === c.parentId)
        );
        for (const orphan of orphans) {
            result.push({ ...orphan, sortOrder: globalOrder++ });
        }
        
        return result;
    };

    const moveUp = () => {
        if (selectedId === null) return;
        const selected = items.find((c) => c.id === selectedId);
        if (!selected) return;
        if (selected.depth === 0) {
            const topLevel = getTopLevelCategories();
            const currentIndex = topLevel.findIndex((c) => c.id === selectedId);
            if (currentIndex <= 0) return;
            const prevTop = topLevel[currentIndex - 1];
            const updated = items.map((c) => {
                if (c.id === selectedId) {
                    return { ...c, sortOrder: prevTop.sortOrder };
                } else if (c.id === prevTop.id) {
                    return { ...c, sortOrder: selected.sortOrder };
                }
                return c;
            });
            setItems(recalculateSortOrders(updated));
            setHasChanges(true);
        } else {
            const siblings = getChildrenOf(selected.parentId!);
            const currentIndex = siblings.findIndex((c) => c.id === selectedId);
            if (currentIndex > 0) {
                const prevSibling = siblings[currentIndex - 1];
                const updated = items.map((c) => {
                    if (c.id === selectedId) {
                        return { ...c, sortOrder: prevSibling.sortOrder };
                    } else if (c.id === prevSibling.id) {
                        return { ...c, sortOrder: selected.sortOrder };
                    }
                    return c;
                });
                setItems(recalculateSortOrders(updated));
                setHasChanges(true);
            }
        }
    };

    const moveDown = () => {
        if (selectedId === null) return;
        const selected = items.find((c) => c.id === selectedId);
        if (!selected) return;
        if (selected.depth === 0) {
            // 상위 카테고리 이동
            const topLevel = getTopLevelCategories();
            const currentIndex = topLevel.findIndex((c) => c.id === selectedId);
            if (currentIndex >= topLevel.length - 1) return;
            const nextTop = topLevel[currentIndex + 1];
            
            // sortOrder 교환
            const updated = items.map((c) => {
                if (c.id === selectedId) {
                    return { ...c, sortOrder: nextTop.sortOrder };
                } else if (c.id === nextTop.id) {
                    return { ...c, sortOrder: selected.sortOrder };
                }
                return c;
            });
            setItems(recalculateSortOrders(updated));
            setHasChanges(true);
        } else {
            // 하위 카테고리 이동
            const siblings = getChildrenOf(selected.parentId!);
            const currentIndex = siblings.findIndex((c) => c.id === selectedId);
            if (currentIndex < siblings.length - 1) {
                const nextSibling = siblings[currentIndex + 1];
                const updated = items.map((c) => {
                    if (c.id === selectedId) {
                        return { ...c, sortOrder: nextSibling.sortOrder };
                    } else if (c.id === nextSibling.id) {
                        return { ...c, sortOrder: selected.sortOrder };
                    }
                    return c;
                });
                setItems(recalculateSortOrders(updated));
                setHasChanges(true);
            }
        }
    };

    const moveIn = () => {
        if (selectedId === null) return;
        const selected = items.find((c) => c.id === selectedId);
        if (!selected) return;
        
        // 현재 선택된 카테고리의 위치를 sortedItems에서 찾기
        const currentIndex = sortedItems.findIndex((c) => c.id === selectedId);
        if (currentIndex <= 0) return; // 첫 번째 항목이면 이동할 상위 카테고리가 없음
        
        // 위로 올라가면서 가장 가까운 상위 카테고리(depth === 0) 찾기
        let targetParent: CategoryItem | null = null;
        for (let i = currentIndex - 1; i >= 0; i--) {
            const item = sortedItems[i];
            if (item.depth === 0) {
                targetParent = item;
                break;
            }
        }
        
        if (!targetParent) return; // 상위 카테고리를 찾지 못하면 이동 불가
        
        // 선택된 카테고리가 이미 해당 상위 카테고리의 하위인지 확인
        if (selected.parentId === targetParent.id) return; // 이미 해당 상위 카테고리의 하위이면 이동 불가
        
        // 가장 가까운 상위 카테고리의 하위로 이동
        const targetChildren = getChildrenOf(targetParent.id);
        const newSortOrder = targetChildren.length > 0
            ? Math.max(...targetChildren.map((c) => c.sortOrder)) + 1
            : 0;
        
        const updated = items.map((c) => {
            if (c.id === selectedId) {
                return { ...c, parentId: targetParent!.id, depth: targetParent!.depth + 1, sortOrder: newSortOrder };
            }
            return c;
        });
        setItems(recalculateSortOrders(updated));
        setHasChanges(true);
    };

    const moveOut = () => {
        if (selectedId === null) return;
        const selected = items.find((c) => c.id === selectedId);
        if (!selected || selected.depth === 0) return;
        const parent = items.find((c) => c.id === selected.parentId);
        if (!parent) return;
        const parentSiblings = getTopLevelCategories();
        const parentIndex = parentSiblings.findIndex((c) => c.id === parent.id);
        if (parentIndex < 0) return;
        const siblings = getChildrenOf(parent.id);
        const currentIndex = siblings.findIndex((c) => c.id === selectedId);
        const nextSiblingIndex = currentIndex + 1;
        let newSortOrder: number;
        if (nextSiblingIndex < siblings.length) {
            newSortOrder = siblings[nextSiblingIndex].sortOrder;
        } else {
            const nextParentIndex = parentIndex + 1;
            newSortOrder = nextParentIndex < parentSiblings.length
                ? parentSiblings[nextParentIndex].sortOrder
                : parent.sortOrder + 1;
        }
        const updated = items.map((c) => {
            if (c.id === selectedId) {
                return { ...c, parentId: null, depth: 0, sortOrder: newSortOrder };
            }
            return c;
        });
        setItems(recalculateSortOrders(updated));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const bulkItems: CategoryBulkUpdateItem[] = items.map((c) => ({
                id: c.id,
                label: c.label,
                parentId: c.parentId,
                depth: c.depth,
                sortOrder: c.sortOrder,
            }));
            await bulkUpdateCategories(bulkItems);
            await load();
            // Sidebar 갱신을 위해 페이지 새로고침
            window.location.reload();
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "저장에 실패했습니다.";
            console.error("Failed to save categories:", e);
            setError(`에러: ${errorMessage}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setItems([...originalItems]);
        setSelectedId(null);
        setHasChanges(false);
    };

    const topLevelCategories = useMemo(() => getTopLevelCategories(), [getTopLevelCategories]);
    const firstTopCategory = useMemo(() => topLevelCategories[0], [topLevelCategories]);

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>카테고리 관리</h1>
                <span style={{ fontSize: 12, opacity: 0.8 }}>추후 RBAC로 페이지 접근 권한 부여 예정</span>
            </div>

            <div
                style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginBottom: 12,
                }}
            >
                <button
                    type="button"
                    onClick={moveUp}
                    disabled={selectedId === null || (firstTopCategory && selectedId === firstTopCategory.id)}
                    title="위로 이동"
                    style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid #444",
                        background: selectedId === null || (firstTopCategory && selectedId === firstTopCategory.id) ? "#f0f0f0" : "#fff",
                        color: selectedId === null || (firstTopCategory && selectedId === firstTopCategory.id) ? "#999" : "#111",
                        cursor: selectedId === null || (firstTopCategory && selectedId === firstTopCategory.id) ? "not-allowed" : "pointer",
                    }}
                >
                    ▲
                </button>
                <button
                    type="button"
                    onClick={moveDown}
                    disabled={selectedId === null}
                    title="아래로 이동"
                    style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid #444",
                        background: selectedId === null ? "#f0f0f0" : "#fff",
                        color: selectedId === null ? "#999" : "#111",
                        cursor: selectedId === null ? "not-allowed" : "pointer",
                    }}
                >
                    ▼
                </button>
                <button
                    type="button"
                    onClick={moveIn}
                    disabled={(() => {
                        if (selectedId === null) return true;
                        const selected = items.find((c) => c.id === selectedId);
                        if (!selected) return true;
                        const currentIndex = sortedItems.findIndex((c) => c.id === selectedId);
                        if (currentIndex <= 0) return true; // 첫 번째 항목이면 이동 불가
                        // 위로 올라가면서 가장 가까운 상위 카테고리(depth === 0) 찾기
                        let targetParent: CategoryItem | null = null;
                        for (let i = currentIndex - 1; i >= 0; i--) {
                            if (sortedItems[i].depth === 0) {
                                targetParent = sortedItems[i];
                                break;
                            }
                        }
                        if (!targetParent) return true; // 상위 카테고리를 찾지 못하면 비활성화
                        // 이미 해당 상위 카테고리의 하위인지 확인
                        if (selected.parentId === targetParent.id) return true; // 이미 하위이면 비활성화
                        return false; // 활성화
                    })()}
                    title="위의 가장 가까운 상위 카테고리 안으로 이동"
                    style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid #444",
                        background: (() => {
                            if (selectedId === null) return "#f0f0f0";
                            const selected = items.find((c) => c.id === selectedId);
                            if (!selected) return "#f0f0f0";
                            const currentIndex = sortedItems.findIndex((c) => c.id === selectedId);
                            if (currentIndex <= 0) return "#f0f0f0";
                            let targetParent: CategoryItem | null = null;
                            for (let i = currentIndex - 1; i >= 0; i--) {
                                if (sortedItems[i].depth === 0) {
                                    targetParent = sortedItems[i];
                                    break;
                                }
                            }
                            if (!targetParent) return "#f0f0f0";
                            if (selected.parentId === targetParent.id) return "#f0f0f0";
                            return "#fff";
                        })(),
                        color: (() => {
                            if (selectedId === null) return "#999";
                            const selected = items.find((c) => c.id === selectedId);
                            if (!selected) return "#999";
                            const currentIndex = sortedItems.findIndex((c) => c.id === selectedId);
                            if (currentIndex <= 0) return "#999";
                            let targetParent: CategoryItem | null = null;
                            for (let i = currentIndex - 1; i >= 0; i--) {
                                if (sortedItems[i].depth === 0) {
                                    targetParent = sortedItems[i];
                                    break;
                                }
                            }
                            if (!targetParent) return "#999";
                            if (selected.parentId === targetParent.id) return "#999";
                            return "#111";
                        })(),
                        cursor: "pointer",
                    }}
                >
                    →
                </button>
                <button
                    type="button"
                    onClick={moveOut}
                    disabled={selectedId === null || (items.find((c) => c.id === selectedId)?.depth ?? 0) === 0}
                    title="상위 카테고리 밖으로 이동"
                    style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid #444",
                        background: selectedId === null || (items.find((c) => c.id === selectedId)?.depth ?? 0) === 0 ? "#f0f0f0" : "#fff",
                        color: selectedId === null || (items.find((c) => c.id === selectedId)?.depth ?? 0) === 0 ? "#999" : "#111",
                        cursor: selectedId === null || (items.find((c) => c.id === selectedId)?.depth ?? 0) === 0 ? "not-allowed" : "pointer",
                    }}
                >
                    ←
                </button>
                <form
                    onSubmit={handleAdd}
                    style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    <input
                        type="text"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder={(() => {
                            if (!selectedId) return "카테고리 이름 (상위 카테고리로 추가)";
                            const selected = items.find(c => c.id === selectedId);
                            if (selected && selected.depth === 0) {
                                return `카테고리 이름 (${selected.label}의 하위로 추가)`;
                            }
                            return "카테고리 이름 (상위 카테고리로 추가)";
                        })()}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid #444",
                            outline: "none",
                            fontSize: 14,
                        }}
                    />
                    <button
                        type="submit"
                        disabled={submitting || !newLabel.trim()}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            border: "1px solid #444",
                            background: submitting || !newLabel.trim() ? "#ccc" : "#2563eb",
                            color: "#fff",
                            fontWeight: 700,
                            cursor: submitting || !newLabel.trim() ? "not-allowed" : "pointer",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {submitting ? "추가 중…" : "카테고리 추가"}
                    </button>
                </form>
                <button
                    type="button"
                    onClick={handleReset}
                    disabled={!hasChanges || submitting}
                    style={{
                        padding: "10px 16px",
                        borderRadius: 8,
                        border: "1px solid #444",
                        background: hasChanges ? "#fff" : "#f0f0f0",
                        color: hasChanges ? "#111" : "#999",
                        fontWeight: 700,
                        cursor: hasChanges && !submitting ? "pointer" : "not-allowed",
                    }}
                >
                    초기화
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!hasChanges || submitting}
                    style={{
                        padding: "10px 16px",
                        borderRadius: 8,
                        border: "1px solid #444",
                        background: hasChanges ? "#2563eb" : "#ccc",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: hasChanges && !submitting ? "pointer" : "not-allowed",
                    }}
                >
                    저장
                </button>
            </div>

            {error && (
                <div style={{ marginBottom: 12, color: "var(--app-error, #c00)", fontWeight: 600 }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div style={{ opacity: 0.8 }}>불러오는 중…</div>
            ) : (
                <div
                    style={{
                        border: "1px solid var(--app-border, #444)",
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "var(--app-bg, #fff)",
                    }}
                >
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #444", background: "#f5f5f5" }}>
                                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700 }}>카테고리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedItems.length === 0 ? (
                                <tr>
                                    <td style={{ padding: 24, textAlign: "center", opacity: 0.8 }}>
                                        카테고리가 없습니다. 위에서 추가해 보세요.
                                    </td>
                                </tr>
                            ) : (
                                sortedItems.map((cat, index) => {
                                    const isSelected = selectedId === cat.id;
                                    const isFirstTop = firstTopCategory && cat.id === firstTopCategory.id;
                                    return (
                                        <tr
                                            key={cat.id}
                                            onClick={() => setSelectedId(cat.id)}
                                            style={{
                                                borderBottom: "1px solid #ddd",
                                                background: isSelected
                                                    ? "#e3f2fd"
                                                    : index % 2 === 0
                                                    ? "#fff"
                                                    : "#fafafa",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <td style={{ padding: "12px 14px" }}>
                                                <div style={{ marginLeft: cat.depth * 20, display: "flex", alignItems: "center" }}>
                                                    <input
                                                        type="text"
                                                        value={cat.label}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => {
                                                            const updated = items.map((c) =>
                                                                c.id === cat.id ? { ...c, label: e.target.value } : c
                                                            );
                                                            setItems(updated);
                                                            setHasChanges(true);
                                                        }}
                                                        style={{
                                                            width: "200px",
                                                            padding: "6px 8px",
                                                            border: "1px solid #ddd",
                                                            borderRadius: 4,
                                                            outline: "none",
                                                            background: "#fff",
                                                            fontSize: 14,
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
