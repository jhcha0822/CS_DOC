import { useEffect, useMemo, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { fetchCategories, type CategoryItem } from "../lib/api";

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
                style={() => ({
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 10,
                    marginBottom: 6,
                    border: "1px solid #444",
                    textDecoration: "none",
                    color: "#111",
                    background: catParam === null ? "#f0f0f0" : "#fff",
                    fontWeight: catParam === null ? 800 : 600,
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
                            style={() => ({
                                display: "block",
                                padding: "10px 12px",
                                borderRadius: 10,
                                marginBottom: 6,
                                border: "1px solid #444",
                                textDecoration: "none",
                                color: "#111",
                                background: isParentSelected ? "#f0f0f0" : "#fff",
                                fontWeight: isParentSelected ? 800 : 600,
                            })}
                        >
                            {parent.label}
                        </NavLink>
                        {children.map((child) => {
                            const isChildSelected = isSelected(child);
                            return (
                                <NavLink
                                    key={child.id}
                                    to={`/posts?cat=${child.id}`}
                                    style={() => ({
                                        display: "block",
                                        padding: "10px 12px",
                                        marginLeft: 20,
                                        borderRadius: 10,
                                        marginBottom: 6,
                                        border: "1px solid #444",
                                        textDecoration: "none",
                                        color: "#111",
                                        background: isChildSelected ? "#f0f0f0" : "#fff",
                                        fontWeight: isChildSelected ? 800 : 600,
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
                <div style={{ padding: "10px 12px", fontSize: 12, opacity: 0.6 }}>
                    카테고리를 불러올 수 없습니다.
                </div>
            )}

            <div style={{ height: 16 }} />

            <div style={{ fontSize: 12, opacity: 0.75, margin: "12px 0 8px" }}>
                바로가기
            </div>

            <a
                href={`${import.meta.env.VITE_API_BASE || "http://localhost:8080"}/swagger-ui/index.html`}
                target="_blank"
                rel="noreferrer"
                    style={{
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "#111",
                    border: "1px solid #444",
                    marginBottom: 6,
                }}
            >
                Swagger UI
            </a>

            <a
                href={`${import.meta.env.VITE_API_BASE || "http://localhost:8080"}/h2-console`}
                target="_blank"
                rel="noreferrer"
                style={{
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "#111",
                    border: "1px solid #444",
                    marginBottom: 6,
                }}
            >
                H2 Console
            </a>

            <div style={{ height: 16 }} />
            <div style={{ fontSize: 12, opacity: 0.75, margin: "12px 0 8px" }}>
                관리
            </div>
            <NavLink
                to="/categories/manage"
                style={({ isActive }) => ({
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "#111",
                    border: "1px solid #444",
                    background: isActive ? "#f0f0f0" : "#fff",
                    fontWeight: isActive ? 800 : 600,
                    marginBottom: 6,
                })}
            >
                카테고리 관리
            </NavLink>
            <NavLink
                to="/posts/versions"
                style={({ isActive }) => ({
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "#111",
                    border: "1px solid #444",
                    background: isActive ? "#f0f0f0" : "#fff",
                    fontWeight: isActive ? 800 : 600,
                })}
            >
                버전 이력
            </NavLink>
        </div>
    );
}
