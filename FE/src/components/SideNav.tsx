import { NavLink, createSearchParams, useSearchParams } from "react-router-dom";
import { CATEGORY_TREE, DEFAULT_CATEGORY, isCategoryKey } from "../lib/categories";

function baseStyle(active: boolean) {
    return {
        display: "block",
        padding: "10px 12px",
        marginBottom: 6,
        borderRadius: 10,
        textDecoration: "none",
        color: "#eaeaea",
        background: active ? "#2b2b2b" : "transparent",
        border: "1px solid #2a2a2a",
        fontWeight: active ? 800 : 600,
    } as const;
}

export default function SideNav() {
    const [sp] = useSearchParams();
    const categoryParam = sp.get("category");
    const current = isCategoryKey(categoryParam) ? categoryParam : DEFAULT_CATEGORY;

    const parent = CATEGORY_TREE;
    const children = CATEGORY_TREE.children;

    return (
        <div>
            <div style={{ fontSize: 12, opacity: 0.75, margin: "12px 0 8px" }}>신입교육자료(Posts)</div>

            {/* ✅ 상위(ALL) */}
            <NavLink
                to={{ pathname: "/posts", search: `?${createSearchParams({ category: parent.key }).toString()}` }}
                style={() => baseStyle(current === parent.key)}
            >
                {parent.label}
            </NavLink>

            {/* ✅ 하위들: 들여쓰기 */}
            <div style={{ marginLeft: 10, marginTop: 8 }}>
                {children.map((c) => (
                    <NavLink
                        key={c.key}
                        to={{ pathname: "/posts", search: `?${createSearchParams({ category: c.key }).toString()}` }}
                        style={() => baseStyle(current === c.key)}
                    >
                        {c.label}
                    </NavLink>
                ))}
            </div>

            <div style={{ height: 16 }} />

            <div style={{ fontSize: 12, opacity: 0.75, margin: "12px 0 8px" }}>바로가기</div>
            <a
                href="http://localhost:8080/swagger-ui/index.html"
                target="_blank"
                rel="noreferrer"
                style={{
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "#eaeaea",
                    border: "1px solid #2a2a2a",
                    marginBottom: 6,
                }}
            >
                Swagger UI
            </a>
            <a
                href="http://localhost:8080/h2-console"
                target="_blank"
                rel="noreferrer"
                style={{
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "#eaeaea",
                    border: "1px solid #2a2a2a",
                }}
            >
                H2 Console
            </a>
        </div>
    );
}
