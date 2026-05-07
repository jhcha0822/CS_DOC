import { useCallback, useEffect, useMemo, useState } from "react";
import {
    createShortcutGroup,
    createShortcutItem,
    deleteShortcutGroup,
    deleteShortcutItem,
    fetchAdminShortcuts,
    updateShortcutGroup,
    updateShortcutItem,
    type ShortcutGroup,
    type ShortcutItem,
} from "../lib/api";
import { ApiError } from "../lib/api";
import { isAdmin } from "../lib/auth";
import ErrorModal from "../components/ErrorModal";

export default function AdminShortcutsPage() {
    const [groups, setGroups] = useState<ShortcutGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupSort, setNewGroupSort] = useState<number>(0);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await fetchAdminShortcuts();
            setGroups(list ?? []);
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "불러오기 실패";
            setError(msg);
            setGroups([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isAdmin()) return;
        load();
    }, [load]);

    const sorted = useMemo(() => {
        return [...groups].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);
    }, [groups]);

    const createGroup = useCallback(async () => {
        const name = newGroupName.trim();
        if (!name) {
            setError("그룹 이름을 입력해 주세요.");
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await createShortcutGroup({ name, sortOrder: Number.isFinite(newGroupSort) ? newGroupSort : 0 });
            setNewGroupName("");
            setNewGroupSort(0);
            await load();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "그룹 생성 실패");
        } finally {
            setSubmitting(false);
        }
    }, [newGroupName, newGroupSort, load]);

    const saveGroup = useCallback(
        async (g: ShortcutGroup, name: string, sortOrder: number) => {
            setSubmitting(true);
            setError(null);
            try {
                await updateShortcutGroup(g.id, { name: name.trim(), sortOrder });
                await load();
            } catch (e) {
                setError(e instanceof ApiError ? e.message : "그룹 수정 실패");
            } finally {
                setSubmitting(false);
            }
        },
        [load]
    );

    const removeGroup = useCallback(
        async (g: ShortcutGroup) => {
            if (!window.confirm(`그룹을 삭제하시겠습니까?\n\n- ${g.name}\n- 하위 링크도 함께 삭제됩니다.`)) return;
            setSubmitting(true);
            setError(null);
            try {
                await deleteShortcutGroup(g.id);
                await load();
            } catch (e) {
                setError(e instanceof ApiError ? e.message : "그룹 삭제 실패");
            } finally {
                setSubmitting(false);
            }
        },
        [load]
    );

    const addItem = useCallback(
        async (groupId: number, name: string, url: string, sortOrder: number) => {
            setSubmitting(true);
            setError(null);
            try {
                await createShortcutItem(groupId, { name: name.trim(), url: url.trim(), sortOrder });
                await load();
            } catch (e) {
                setError(e instanceof ApiError ? e.message : "링크 추가 실패");
            } finally {
                setSubmitting(false);
            }
        },
        [load]
    );

    const saveItem = useCallback(
        async (itemId: number, name: string, url: string, sortOrder: number) => {
            setSubmitting(true);
            setError(null);
            try {
                await updateShortcutItem(itemId, { name: name.trim(), url: url.trim(), sortOrder });
                await load();
            } catch (e) {
                setError(e instanceof ApiError ? e.message : "링크 수정 실패");
            } finally {
                setSubmitting(false);
            }
        },
        [load]
    );

    const removeItem = useCallback(
        async (item: ShortcutItem) => {
            if (!window.confirm(`링크를 삭제하시겠습니까?\n\n- ${item.name}`)) return;
            setSubmitting(true);
            setError(null);
            try {
                await deleteShortcutItem(item.id);
                await load();
            } catch (e) {
                setError(e instanceof ApiError ? e.message : "링크 삭제 실패");
            } finally {
                setSubmitting(false);
            }
        },
        [load]
    );

    if (!isAdmin()) {
        return (
            <div style={{ padding: 24 }}>
                <p style={{ color: "#dc2626" }}>관리자만 접근할 수 있습니다.</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 960 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800 }}>바로가기 관리</h1>
            <p style={{ margin: "0 0 18px", fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
                헤더(종 아이콘 옆)에 노출되는 바로가기 메뉴를 그룹/링크 단위로 관리합니다. 그룹 이름은 상단 메뉴명으로 노출되고,
                각 그룹 아래 링크는 새 탭으로 열립니다.
            </p>

            <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>그룹 추가</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: 10, alignItems: "center" }}>
                    <div style={tableHeaderCell}>그룹명</div>
                    <div style={tableHeaderCell}>우선도</div>
                    <div />
                    <input
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="그룹 이름 (예: QA)"
                        style={textInput}
                    />
                    <input
                        type="number"
                        value={newGroupSort}
                        onChange={(e) => setNewGroupSort(Number(e.target.value))}
                        placeholder="우선도"
                        style={numberInput}
                    />
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={createGroup}
                        className="btn-primary"
                        style={{ padding: "10px 14px" }}
                    >
                        {submitting ? "처리 중…" : "추가"}
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ opacity: 0.8 }}>불러오는 중...</div>
            ) : sorted.length === 0 ? (
                <div style={{ padding: 16, border: "1px dashed #d1d5db", borderRadius: 10, color: "#6b7280" }}>
                    아직 그룹이 없습니다. 위에서 그룹을 추가해 주세요.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {sorted.map((g) => (
                        <GroupCard
                            key={g.id}
                            group={g}
                            busy={submitting}
                            onSaveGroup={saveGroup}
                            onDeleteGroup={removeGroup}
                            onAddItem={addItem}
                            onSaveItem={saveItem}
                            onDeleteItem={removeItem}
                        />
                    ))}
                </div>
            )}

            <ErrorModal open={!!error} message={error ?? ""} onClose={() => setError(null)} />
        </div>
    );
}

function GroupCard(props: {
    group: ShortcutGroup;
    busy: boolean;
    onSaveGroup: (g: ShortcutGroup, name: string, sortOrder: number) => Promise<void>;
    onDeleteGroup: (g: ShortcutGroup) => Promise<void>;
    onAddItem: (groupId: number, name: string, url: string, sortOrder: number) => Promise<void>;
    onSaveItem: (itemId: number, name: string, url: string, sortOrder: number) => Promise<void>;
    onDeleteItem: (item: ShortcutItem) => Promise<void>;
}) {
    const { group: g, busy, onSaveGroup, onDeleteGroup, onAddItem, onSaveItem, onDeleteItem } = props;
    const [name, setName] = useState(g.name);
    const [sort, setSort] = useState<number>(g.sortOrder ?? 0);
    const [newItemName, setNewItemName] = useState("");
    const [newItemUrl, setNewItemUrl] = useState("");
    const [newItemSort, setNewItemSort] = useState<number>(0);

    const items = useMemo(() => {
        return [...(g.items ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);
    }, [g.items]);

    return (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
            <div style={{ padding: 14, borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", gap: 10, alignItems: "center" }}>
                    <div style={tableHeaderCell}>그룹명</div>
                    <div style={tableHeaderCell}>우선도</div>
                    <div />
                    <div />
                    <input value={name} onChange={(e) => setName(e.target.value)} style={textInput} />
                    <input type="number" value={sort} onChange={(e) => setSort(Number(e.target.value))} style={numberInput} />
                    <button
                        type="button"
                        disabled={busy}
                        className="btn-secondary"
                        onClick={() => onSaveGroup(g, name, sort)}
                        style={{ padding: "10px 14px" }}
                    >
                        저장
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDeleteGroup(g)}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            border: "1px solid #dc2626",
                            background: "#dc2626",
                            color: "#fff",
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        삭제
                    </button>
                </div>
            </div>

            <div style={{ padding: 14 }}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>링크</div>
                <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 120px 160px", gap: 10, alignItems: "center", padding: "0 0 8px" }}>
                    <div style={tableHeaderCell}>링크명</div>
                    <div style={tableHeaderCell}>주소</div>
                    <div style={tableHeaderCell}>우선도</div>
                    <div style={tableHeaderCell}>작업</div>
                </div>
                {items.length === 0 ? (
                    <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>링크가 없습니다.</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                        {items.map((it) => (
                            <ItemRow
                                key={it.id}
                                item={it}
                                busy={busy}
                                onSave={(name2, url2, sort2) => onSaveItem(it.id, name2, url2, sort2)}
                                onDelete={() => onDeleteItem(it)}
                            />
                        ))}
                    </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 120px 160px", gap: 10, alignItems: "center", paddingTop: 12, borderTop: "1px dashed #e5e7eb" }}>
                    <input
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="링크 이름 (예: FED v5)"
                        style={textInputFixed}
                    />
                    <input
                        value={newItemUrl}
                        onChange={(e) => setNewItemUrl(e.target.value)}
                        placeholder="URL (https://...)"
                        style={textInput}
                    />
                    <input
                        type="number"
                        value={newItemSort}
                        onChange={(e) => setNewItemSort(Number(e.target.value))}
                        placeholder="정렬"
                        style={numberInput}
                    />
                    <button
                        type="button"
                        disabled={busy}
                        className="btn-primary"
                        onClick={async () => {
                            const n = newItemName.trim();
                            const u = newItemUrl.trim();
                            if (!n) return;
                            if (!u) return;
                            await onAddItem(g.id, n, u, newItemSort);
                            setNewItemName("");
                            setNewItemUrl("");
                            setNewItemSort(0);
                        }}
                        style={{ padding: "10px 14px" }}
                    >
                        링크 추가
                    </button>
                </div>
            </div>
        </div>
    );
}

function ItemRow(props: {
    item: ShortcutItem;
    busy: boolean;
    onSave: (name: string, url: string, sortOrder: number) => Promise<void>;
    onDelete: () => Promise<void>;
}) {
    const { item, busy, onSave, onDelete } = props;
    const [name, setName] = useState(item.name);
    const [url, setUrl] = useState(item.url);
    const [sort, setSort] = useState<number>(item.sortOrder ?? 0);

    return (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 120px 160px", gap: 10, alignItems: "center" }}>
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={textInputFixed}
            />
            <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                style={textInput}
            />
            <input
                type="number"
                value={sort}
                onChange={(e) => setSort(Number(e.target.value))}
                style={numberInput}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" disabled={busy} className="btn-secondary" onClick={() => onSave(name, url, sort)} style={{ padding: "10px 14px" }}>
                    저장
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDelete()}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1px solid #dc2626",
                        background: "#fff",
                        color: "#dc2626",
                        fontWeight: 800,
                        cursor: "pointer",
                    }}
                >
                    삭제
                </button>
            </div>
        </div>
    );
}

const tableHeaderCell: React.CSSProperties = {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 800,
    paddingLeft: 2,
};

const textInput: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    height: 40,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    outline: "none",
};

const textInputFixed: React.CSSProperties = {
    ...textInput,
    maxWidth: 220,
};

const numberInput: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    height: 40,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    outline: "none",
};

