import { useEffect, useMemo, useRef, useState } from "react";
import { fetchShortcuts, type ShortcutGroup } from "../lib/api";

type ShortcutMenusProps = {
    /** 종 아이콘 옆에 붙여 렌더링할 스타일 */
    compact?: boolean;
};

export default function ShortcutMenus({ compact }: ShortcutMenusProps) {
    const [groups, setGroups] = useState<ShortcutGroup[]>([]);
    const [openGroupId, setOpenGroupId] = useState<number | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchShortcuts().then(setGroups).catch(() => setGroups([]));
    }, []);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!rootRef.current) return;
            if (!rootRef.current.contains(e.target as Node)) {
                setOpenGroupId(null);
            }
        };
        document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, []);

    const sorted = useMemo(() => {
        return [...groups].sort((a, b) => {
            const c = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
            if (c !== 0) return c;
            return a.id - b.id;
        });
    }, [groups]);

    if (sorted.length === 0) return null;

    return (
        <div ref={rootRef} style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 8 }}>
            {sorted.map((g) => {
                const items = (g.items ?? []).filter((x) => (x.name ?? "").trim() && (x.url ?? "").trim());
                if (items.length === 0) return null;
                const open = openGroupId === g.id;
                return (
                    <div
                        key={g.id}
                        style={{ position: "relative" }}
                    >
                        <button
                            type="button"
                            onClick={() => setOpenGroupId((prev) => (prev === g.id ? null : g.id))}
                            style={{
                                padding: compact ? "6px 10px" : "7px 12px",
                                borderRadius: 10,
                                border: "1px solid #e5e7eb",
                                background: open ? "#f3f4f6" : "#fff",
                                color: "#111827",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                                lineHeight: 1.1,
                                whiteSpace: "nowrap",
                            }}
                            aria-haspopup="menu"
                            aria-expanded={open}
                        >
                            {g.name}
                        </button>

                        {open && (
                            <div
                                role="menu"
                                style={{
                                    position: "absolute",
                                    top: "100%",
                                    right: 0,
                                    marginTop: 8,
                                    minWidth: 220,
                                    background: "#fff",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 12,
                                    boxShadow: "0 8px 30px rgba(0,0,0,0.14)",
                                    overflow: "hidden",
                                    zIndex: 1200,
                                }}
                            >
                                <div style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: 13 }}>
                                    {g.name}
                                </div>
                                <div style={{ padding: "6px 0" }}>
                                    {items
                                        .slice()
                                        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id)
                                        .map((it) => (
                                            <a
                                                key={it.id}
                                                href={it.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    display: "block",
                                                    padding: "10px 12px",
                                                    color: "#111827",
                                                    textDecoration: "none",
                                                    fontSize: 14,
                                                }}
                                                onClick={() => setOpenGroupId(null)}
                                            >
                                                {it.name}
                                            </a>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

