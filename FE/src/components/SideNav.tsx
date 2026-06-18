import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { fetchCategories, fetchSidebarMenuSetting, type CategoryItem, type SidebarMenuSetting } from "../lib/api";
import { isAdmin } from "../lib/auth";

/** 게시글 목록 공지 행과 동일 — 선택 여부와 관계없이 고정 */
const NOTICE_NAV_BG = "#fee2e2";
const NOTICE_NAV_TEXT = "#000000";
/** 메모 목록과 동일 — 고정 */
const MEMO_NAV_BG = "#fef9c3";
const MEMO_NAV_TEXT = "#111827";
/** TSS AI 테스트 — 선택 여부와 무관하게 배경 고정 (palegreen) */
const TSS_NAV_BG = "#98fb98";
const TSS_NAV_TEXT = "#111827";

const CAT_BLUE_BG = "#3B82F6";
const CAT_BLUE_TEXT = "#ffffff";

const isNoticeCategory = (c: CategoryItem) => c.label === "공지사항" || c.code === "CAT_NOTICE";

const linkBase: CSSProperties = {
    display: "block",
    padding: "10px 12px",
    borderRadius: 6,
    marginBottom: 4,
    textDecoration: "none",
    fontSize: 14,
};

export default function SideNav() {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const catParam = searchParams.get("cat");
    const categoryIdParam = catParam ? parseInt(catParam, 10) : null;

    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [menuSetting, setMenuSetting] = useState<SidebarMenuSetting | null>(null);

    const refetch = useMemo(() => {
        return async () => {
            try {
                const [list, setting] = await Promise.all([
                    fetchCategories().catch(() => [] as CategoryItem[]),
                    fetchSidebarMenuSetting().catch(() => null),
                ]);
                setCategories(list || []);
                setMenuSetting(setting);
            } catch {
                // ignore
            }
        };
    }, []);

    useEffect(() => {
        Promise.all([
            fetchCategories().catch(() => [] as CategoryItem[]),
            fetchSidebarMenuSetting().catch(() => null),
        ])
            .then(([list, setting]) => {
                setCategories(list || []);
                setMenuSetting(setting);
                setLoading(false);
            })
            .catch((e) => {
                console.error("Failed to fetch side nav data:", e);
                setCategories([]);
                setMenuSetting(null);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        const onUpdated = () => {
            refetch();
        };
        window.addEventListener("sidebar-menu-setting-updated", onUpdated);
        return () => window.removeEventListener("sidebar-menu-setting-updated", onUpdated);
    }, [refetch]);

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

    const noticeParent = useMemo(
        () => topLevelCategories.find((c) => isNoticeCategory(c)) ?? null,
        [topLevelCategories]
    );
    const regularTopLevelCategories = useMemo(
        () => topLevelCategories.filter((c) => !isNoticeCategory(c) && c.sidebarVisible !== false),
        [topLevelCategories]
    );

    const getChildrenOf = (parentId: number) => {
        return sortedCategories.filter((c) => c.parentId === parentId);
    };

    /** 공지 제외 상위 카테고리: 본인 또는 소속 하위가 선택된 경우 */
    const isRegularParentActive = (parent: CategoryItem) => {
        if (categoryIdParam == null) return false;
        const children = getChildrenOf(parent.id);
        const childIds = children.map((c) => c.id);
        return categoryIdParam === parent.id || childIds.includes(categoryIdParam);
    };

    const onMemo = location.pathname === "/memos" || location.pathname.startsWith("/memos/");
    const onTssAiTest = location.pathname === "/tss-ai-test";
    const memoVisible = (menuSetting?.showMemo ?? true) || onMemo;
    const adminSectionVisible = (menuSetting?.showAdminSection ?? true);
    const onAdminArea =
        location.pathname.startsWith("/admin/") ||
        location.pathname.startsWith("/users/") ||
        location.pathname.startsWith("/categories/") ||
        location.pathname.startsWith("/posts/versions");
    // "메뉴 관리"는 접근 경로가 막히지 않도록 항상 노출(관리자만)
    const showAdminSectionBlock = isAdmin();
    const showPostVersions = (menuSetting?.showPostVersions ?? true) || location.pathname.startsWith("/posts/versions");
    const showAdminContentStats = (menuSetting?.showAdminContentStats ?? true) || location.pathname.startsWith("/admin/content-stats");
    const showAdminShortcuts = (menuSetting?.showAdminShortcuts ?? true) || location.pathname.startsWith("/admin/shortcuts");
    const showUserManage = (menuSetting?.showUserManage ?? true) || location.pathname.startsWith("/users/manage");
    const showAdminAssignmentGrades = (menuSetting?.showAdminAssignmentGrades ?? true) || location.pathname.startsWith("/admin/assignment-grades");

    if (loading) {
        return <div style={{ opacity: 0.8 }}>불러오는 중...</div>;
    }

    return (
        <div className="side-nav-plain">
            <Link
                to="/posts"
                style={{
                    ...linkBase,
                    fontWeight: 600,
                    color: CAT_BLUE_TEXT,
                    background: CAT_BLUE_BG,
                }}
            >
                전체
            </Link>

            {noticeParent && (
                <div key={noticeParent.id}>
                    <Link
                        to={`/posts?cat=${noticeParent.id}`}
                        style={{
                            ...linkBase,
                            color: NOTICE_NAV_TEXT,
                            background: NOTICE_NAV_BG,
                            fontWeight: 600,
                        }}
                    >
                        {noticeParent.label}
                    </Link>
                    {getChildrenOf(noticeParent.id)
                        .filter((c) => c.sidebarVisible !== false)
                        .map((child) => {
                        const childOn =
                            categoryIdParam === child.id || categoryIdParam === noticeParent.id;
                        return (
                            <Link
                                key={child.id}
                                to={`/posts?cat=${child.id}`}
                                style={{
                                    display: "block",
                                    padding: "8px 12px 8px 32px",
                                    marginBottom: 2,
                                    textDecoration: "none",
                                    color: childOn ? "#374151" : "#6b7280",
                                    fontWeight: childOn ? 500 : 400,
                                    fontSize: 13,
                                    background: "transparent",
                                }}
                            >
                                {child.label}
                            </Link>
                        );
                    })}
                </div>
            )}

            {memoVisible && (
                <div>
                    <Link
                        to="/memos"
                        style={{
                            ...linkBase,
                            color: MEMO_NAV_TEXT,
                            background: MEMO_NAV_BG,
                            fontWeight: onMemo && !onTssAiTest ? 700 : 600,
                        }}
                    >
                        메모
                    </Link>
                    <Link
                        to="/tss-ai-test"
                        style={{
                            ...linkBase,
                            color: TSS_NAV_TEXT,
                            background: TSS_NAV_BG,
                            fontWeight: onTssAiTest ? 700 : 600,
                        }}
                    >
                        TSS AI 테스트
                    </Link>
                </div>
            )}

            {topLevelCategories.length === 0 && (
                <div style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>
                    카테고리를 불러올 수 없습니다.
                </div>
            )}
            {regularTopLevelCategories.map((parent) => {
                const children = getChildrenOf(parent.id).filter((c) => c.sidebarVisible !== false);
                const parentOn = isRegularParentActive(parent);
                return (
                    <div key={parent.id}>
                        <Link
                            to={`/posts?cat=${parent.id}`}
                            style={{
                                ...linkBase,
                                color: parentOn ? CAT_BLUE_TEXT : "#374151",
                                background: parentOn ? CAT_BLUE_BG : "transparent",
                                fontWeight: parentOn ? 600 : 500,
                            }}
                        >
                            {parent.label}
                        </Link>
                        {children.length > 0 &&
                            children.map((child) => {
                                const childOn =
                                    categoryIdParam === child.id || categoryIdParam === parent.id;
                                return (
                                    <Link
                                        key={child.id}
                                        to={`/posts?cat=${child.id}`}
                                        style={{
                                            display: "block",
                                            padding: "8px 12px 8px 32px",
                                            marginBottom: 2,
                                            textDecoration: "none",
                                            color: childOn ? "#374151" : "#6b7280",
                                            fontWeight: childOn ? 500 : 400,
                                            fontSize: 13,
                                            background: "transparent",
                                        }}
                                    >
                                        {child.label}
                                    </Link>
                                );
                            })}
                    </div>
                );
            })}

            {showAdminSectionBlock && (
                <>
                    <div style={{ height: 20 }} />
                    {(adminSectionVisible || onAdminArea) && (
                        <div
                            style={{
                                fontSize: 11,
                                color: "#9ca3af",
                                margin: "12px 0 8px",
                                paddingLeft: 12,
                                fontWeight: 500,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                            }}
                        >
                            관리
                        </div>
                    )}
                    <Link
                        to="/categories/manage"
                        style={{
                            ...linkBase,
                            color: "#374151",
                            background: "transparent",
                        }}
                    >
                        메뉴 관리
                    </Link>
                    {showPostVersions && (
                        <Link
                            to="/posts/versions"
                            style={{
                                ...linkBase,
                                color: "#374151",
                                background: "transparent",
                            }}
                        >
                            버전 이력
                        </Link>
                    )}
                    {showAdminContentStats && (
                        <Link
                            to="/admin/content-stats"
                            style={{
                                ...linkBase,
                                color: "#374151",
                                background: "transparent",
                            }}
                        >
                            게시글 통계
                        </Link>
                    )}
                    {showAdminShortcuts && (
                        <Link
                            to="/admin/shortcuts"
                            style={{
                                ...linkBase,
                                color: "#374151",
                                background: "transparent",
                            }}
                        >
                            바로가기 관리
                        </Link>
                    )}
                    {showUserManage && (
                        <Link
                            to="/users/manage"
                            style={{
                                ...linkBase,
                                color: "#374151",
                                background: "transparent",
                            }}
                        >
                            사용자 관리
                        </Link>
                    )}
                    {showAdminAssignmentGrades && (
                        <Link
                            to="/admin/assignment-grades"
                            style={{
                                ...linkBase,
                                color: "#374151",
                                background: "transparent",
                                marginBottom: 0,
                            }}
                        >
                            실습 채점 조회
                        </Link>
                    )}
                </>
            )}
        </div>
    );
}
