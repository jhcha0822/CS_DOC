import { NavLink, useSearchParams } from "react-router-dom";
import {
    CATEGORY_TREE,
    getCurrentCategoryKeyFromCatParam,
    KEY_TO_API_CATEGORY,
} from "../lib/categories";

export default function SideNav() {
    const [sp] = useSearchParams();
    const catParam = sp.get("cat");
    const currentKey = getCurrentCategoryKeyFromCatParam(catParam);

    return (
        <div>
            {CATEGORY_TREE.map((item) => {
                const search =
                    item.key === "newbie"
                        ? ""
                        : `?cat=${KEY_TO_API_CATEGORY[item.key]}`;
                const to = `/posts${search}`;
                return (
                    <NavLink
                        key={item.key}
                        to={to}
                        style={() => ({
                            display: "block",
                            padding: "10px 12px",
                            borderRadius: 10,
                            marginBottom: 6,
                            border: "1px solid #444",
                            textDecoration: "none",
                            color: "#111",
                            background: currentKey === item.key ? "#f0f0f0" : "transparent",
                            fontWeight: currentKey === item.key ? 800 : 600,
                        })}
                    >
                        {item.label}
                    </NavLink>
                );
            })}

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
                }}
            >
                H2 Console
            </a>
        </div>
    );
}
