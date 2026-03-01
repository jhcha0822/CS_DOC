import { useEffect, useMemo, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { fetchCategories, type CategoryItem } from "../lib/api";
import { isAdmin } from "../lib/auth";

export default function SideNav() {
    const [sp] = useSearchParams();
    const catParam = sp.get("cat");
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories()
            .then((list) => {
                setCategories(list || []);
                setLoading(false);
            })
            .catch((e) => {
                console.error("Failed to fetch categories:", e);
                setCategories([]);
                setLoading(false);
            });
    }, []);

    const sortedCategories = useMemo(() => {
        return [...categories].sort((a, b) => {
            if (a.depth !== b.depth) return a.depth - b.depth;
            if (a.depth === 0) return a.sortOrder - b.sortOrder;
            if (a.parentId !== b.parentId) {
                const aParent = categories.find((c) => c.id === a.parentId);
                const bParent = categories.find((c) => c.id === b.parentId);
                if (aParent && bParent) {
                    const parentOrder = aParent.sortOrder - bParent.sortOrder;
                    if (parentOrder !== 0) return parentOrder;
                }
                return (a.parentId ?? 0) - (b.parentId ?? 0);
            }
            return a.sortOrder - b.sortOrder;
        });
    }, [categories]);

    const topLevelCategories = useMemo(() => {
        return sortedCategories.filter((c) => c.depth === 0);
    }, [sortedCategories]);

    const getChildrenOf = (parentId: number) => {
        return sortedCategories.filter((c) => c.parentId === parentId);
    };

    const categoryIdParam = catParam ? parseInt(catParam, 10) : null;

    /** 전체 선택(cat 없음) 시 모두 하이라이트. 상위 선택 시 해당 상위+하위, 하위 선택 시 해당 하위+상위 하이라이트 */
    const isSelected = (cat: CategoryItem | null) => {
        if (!cat) return categoryIdParam === null;
        if (categoryIdParam === null) return true;
        if (cat.depth === 0) {
            const children = getChildrenOf(cat.id);
            const childIds = children.map((c) => c.id);
            return categoryIdParam === cat.id || childIds.includes(categoryIdParam);
        }
        return categoryIdParam === cat.id || categoryIdParam === cat.parentId;
    };

    if (loading) {
        return <div style={{ opacity: 0.8 }}>불러오는 중...</div>;
    }

    return (
        <div>
            <NavLink
                to="/posts"
                style={({ isActive }) => ({
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 6,
                    marginBottom: 4,
                    textDecoration: "none",
                    color: isActive || catParam === null ? "#ffffff" : "#374151",
                    background: isActive || catParam === null ? "#3B82F6" : "transparent",
                    fontWeight: isActive || catParam === null ? 600 : 500,
                    fontSize: 14,
                })}
            >
                전체
            </NavLink>
            {topLevelCategories.length > 0 ? (
                topLevelCategories.map((parent) => {
                const children = getChildrenOf(parent.id);
                const isParentSelected = isSelected(parent);
                return (
                    <div key={parent.id}>
                        <NavLink
                            to={`/posts?cat=${parent.id}`}
                            style={({ isActive }) => ({
                                display: "block",
                                padding: "10px 12px",
                                borderRadius: 6,
                                marginBottom: 4,
                                textDecoration: "none",
                                color: isActive || isParentSelected ? "#ffffff" : "#374151",
                                background: isActive || isParentSelected ? "#3B82F6" : "transparent",
                                fontWeight: isActive || isParentSelected ? 600 : 500,
                                fontSize: 14,
                            })}
                        >
                            {parent.label}
                        </NavLink>
                        {children.length > 0 && children.map((child) => {
                            const isChildSelected = isSelected(child);
                            return (
                                <NavLink
                                    key={child.id}
                                    to={`/posts?cat=${child.id}`}
                                    style={({ isActive }) => ({
                                        display: "block",
                                        padding: "8px 12px 8px 32px",
                                        marginBottom: 2,
                                        textDecoration: "none",
                                        color: isActive || isChildSelected ? "#374151" : "#6b7280",
                                        background: "transparent",
                                        fontWeight: isActive || isChildSelected ? 500 : 400,
                                        fontSize: 13,
                                    })}
                                >
                                    {child.label}
                                </NavLink>
                            );
                        })}
                    </div>
                );
                })
            ) : (
                <div style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>
                    카테고리를 불러올 수 없습니다.
                </div>
            )}

            <div style={{ height: 20 }} />
            <div style={{ fontSize: 11, color: "#9ca3af", margin: "12px 0 8px", paddingLeft: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                메모
            </div>
            <NavLink
                to="/memos"
                style={({ isActive }) => ({
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 6,
                    marginBottom: 4,
                    textDecoration: "none",
                    color: isActive ? "#ffffff" : "#374151",
                    background: isActive ? "#3B82F6" : "transparent",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 14,
                })}
            >
                메모
            </NavLink>

            {isAdmin() && (
                <>
                    <div style={{ height: 20 }} />
                    <div style={{ fontSize: 11, color: "#9ca3af", margin: "12px 0 8px", paddingLeft: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        관리
                    </div>
                    <NavLink
                        to="/categories/manage"
                        style={({ isActive }) => ({
                            display: "block",
                            padding: "10px 12px",
                            borderRadius: 6,
                            textDecoration: "none",
                            color: isActive ? "#ffffff" : "#374151",
                            background: isActive ? "#3B82F6" : "transparent",
                            fontWeight: isActive ? 600 : 500,
                            fontSize: 14,
                            marginBottom: 4,
                        })}
                    >
                        카테고리 관리
                    </NavLink>
                    <NavLink
                        to="/posts/versions"
                        style={({ isActive }) => ({
                            display: "block",
                            padding: "10px 12px",
                            borderRadius: 6,
                            textDecoration: "none",
                            color: isActive ? "#ffffff" : "#374151",
                            background: isActive ? "#3B82F6" : "transparent",
                            fontWeight: isActive ? 600 : 500,
                            fontSize: 14,
                            marginBottom: 4,
                        })}
                    >
                        버전 이력
                    </NavLink>
                    <NavLink
                        to="/users/manage"
                        style={({ isActive }) => ({
                            display: "block",
                            padding: "10px 12px",
                            borderRadius: 6,
                            textDecoration: "none",
                            color: isActive ? "#ffffff" : "#374151",
                            background: isActive ? "#3B82F6" : "transparent",
                            fontWeight: isActive ? 600 : 500,
                            fontSize: 14,
                            marginBottom: 4,
                        })}
                    >
                        사용자 관리
                    </NavLink>
                    <NavLink
                        to="/admin/assignment-grades"
                        style={({ isActive }) => ({
                            display: "block",
                            padding: "10px 12px",
                            borderRadius: 6,
                            textDecoration: "none",
                            color: isActive ? "#ffffff" : "#374151",
                            background: isActive ? "#3B82F6" : "transparent",
                            fontWeight: isActive ? 600 : 500,
                            fontSize: 14,
                        })}
                    >
                        실습 채점 조회
                    </NavLink>
                </>
            )}
        </div>
    );
}
