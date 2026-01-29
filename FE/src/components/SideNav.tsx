import { createSearchParams, NavLink, useSearchParams } from "react-router-dom";
import { DEFAULT_CATEGORY, isCategoryKey, NAV_ITEMS, type CategoryKey } from "../lib/categories";

export default function SideNav() {
    const [sp] = useSearchParams();
    const categoryParam = sp.get("category");
    const current: CategoryKey = isCategoryKey(categoryParam) ? categoryParam : DEFAULT_CATEGORY;

    return (
        <div>
            {NAV_ITEMS.map((item) => (
                <NavLink
                    key={item.key}
                    to={{
                        pathname: "/posts",
                        search: `?${createSearchParams({ category: item.key }).toString()}`,
                    }}
                    style={() => ({
                        display: "block",
                        padding: "10px 12px",
                        borderRadius: 10,
                        marginBottom: 6,
                        border: "1px solid #2a2a2a",
                        textDecoration: "none",
                        color: "#eaeaea",
                        background: current === item.key ? "#2b2b2b" : "transparent",
                        fontWeight: current === item.key ? 800 : 600,
                    })}
                >
                    {item.label}
                </NavLink>

            ))}
            <div style={{ height: 16 }} />

            <div style={{ fontSize: 12, opacity: 0.75, margin: "12px 0 8px" }}>
                바로가기
            </div>

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

