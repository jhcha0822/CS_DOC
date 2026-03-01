import { useCallback, useEffect, useRef, useState } from "react";
import {
    fetchMemos,
    fetchMemo,
    createMemo,
    updateMemo,
    deleteMemo,
    uploadImage,
    type MemoListItem,
    type MemoDetail,
} from "../lib/api";
import { ApiError } from "../lib/api";
import { getCurrentUser } from "../lib/auth";
import ErrorModal from "../components/ErrorModal";

const API_BASE = (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? "http://localhost:8080";

function formatMemoDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const day = weekdays[d.getDay()];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const date = String(d.getDate()).padStart(2, "0");
    const hour = d.getHours();
    const ampm = hour < 12 ? "오전" : "오후";
    const h = hour % 12 || 12;
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${day}) ${year}-${month}-${date} ${ampm} ${h}:${min}`;
}

function parseImagesJson(json: string | null): { url: string; name?: string }[] {
    if (!json || json.trim() === "" || json.trim() === "[]") return [];
    try {
        const arr = JSON.parse(json) as unknown[];
        if (!Array.isArray(arr)) return [];
        return arr
            .filter((x): x is { url?: string; name?: string } => x != null && typeof x === "object")
            .map((x) => ({ url: x.url ?? "", name: x.name }))
            .filter((x) => x.url);
    } catch {
        return [];
    }
}

function stringifyImages(list: { url: string; name?: string }[]): string {
    return JSON.stringify(list.map((x) => (x.name ? { url: x.url, name: x.name } : { url: x.url })));
}

const MAX_IMAGES = 10;

export default function MemoPage() {
    const [list, setList] = useState<MemoListItem[]>([]);
    const [, setTotalElements] = useState(0);
    const [keyword, setKeyword] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [detail, setDetail] = useState<MemoDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editBody, setEditBody] = useState("");
    const [editImages, setEditImages] = useState<{ url: string; name?: string }[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newBody, setNewBody] = useState("");
    const [newImages, setNewImages] = useState<{ url: string; name?: string }[]>([]);
    const [listWidth, setListWidth] = useState(450); // 기본 메모 목록 폭 (더 넓게)
    const isResizingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [modalImage, setModalImage] = useState<{ url: string; name?: string } | null>(null);

    const loadList = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchMemos({ keyword: keyword || undefined, page: 0, size: 1000 });
            setList(res.items ?? []);
            setTotalElements(res.totalElements ?? 0);
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "목록을 불러올 수 없습니다.";
            setError(msg);
            setList([]);
        } finally {
            setLoading(false);
        }
    }, [keyword]);

    useEffect(() => {
        loadList();
    }, [loadList]);

    const handleSearch = useCallback(() => {
        setKeyword(searchInput.trim());
    }, [searchInput]);

    const handleSelect = useCallback(async (id: number) => {
        setSelectedId(id);
        setDetail(null);
        setDetailLoading(true);
        setError(null);
        try {
            const m = await fetchMemo(id);
            setDetail(m);
            setEditTitle(m.title);
            setEditBody(m.body ?? "");
            setEditImages(parseImagesJson(m.images));
            setEditing(false);
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "메모를 불러올 수 없습니다.";
            setError(msg);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const startNew = useCallback(() => {
        setSelectedId(null);
        setDetail(null);
        setCreating(true);
        setNewTitle("");
        setNewBody("");
        setNewImages([]);
        setError(null);
    }, []);

    const cancelNew = useCallback(() => {
        setCreating(false);
        setNewTitle("");
        setNewBody("");
        setNewImages([]);
    }, []);

    const saveNew = useCallback(async () => {
        if (!newTitle.trim()) {
            setError("제목을 입력하세요.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const currentUser = getCurrentUser();
            const created = await createMemo({
                title: newTitle.trim(),
                body: newBody,
                images: stringifyImages(newImages),
                userId: currentUser?.id,
            });
            setCreating(false);
            setNewTitle("");
            setNewBody("");
            setNewImages([]);
            loadList();
            setSelectedId(created.id);
            setDetail(created);
            setEditTitle(created.title);
            setEditBody(created.body ?? "");
            setEditImages(parseImagesJson(created.images));
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "저장에 실패했습니다.";
            setError(msg);
        } finally {
            setSaving(false);
        }
    }, [newTitle, newBody, newImages, loadList]);

    const startEdit = useCallback(() => {
        setEditing(true);
    }, []);

    const cancelEdit = useCallback(() => {
        if (detail) {
            setEditTitle(detail.title);
            setEditBody(detail.body ?? "");
            setEditImages(parseImagesJson(detail.images));
        }
        setEditing(false);
    }, [detail]);

    const saveEdit = useCallback(async () => {
        if (selectedId == null || !editTitle.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const currentUser = getCurrentUser();
            const updated = await updateMemo(selectedId, {
                title: editTitle.trim(),
                body: editBody,
                images: stringifyImages(editImages),
                userId: currentUser?.id,
            });
            setDetail(updated);
            setEditing(false);
            loadList();
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "저장에 실패했습니다.";
            setError(msg);
        } finally {
            setSaving(false);
        }
    }, [selectedId, editTitle, editBody, editImages, loadList]);

    const handleDelete = useCallback(async () => {
        if (selectedId == null || !window.confirm("이 메모를 삭제하시겠습니까?")) return;
        setSaving(true);
        setError(null);
        try {
            await deleteMemo(selectedId);
            setSelectedId(null);
            setDetail(null);
            loadList();
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "삭제에 실패했습니다.";
            setError(msg);
        } finally {
            setSaving(false);
        }
    }, [selectedId, loadList]);

    const addImage = useCallback(async (file: File) => {
        if (editImages.length >= MAX_IMAGES) {
            setError(`이미지는 최대 ${MAX_IMAGES}개까지입니다.`);
            return;
        }
        try {
            const { url } = await uploadImage(file);
            setEditImages((prev) => [...prev, { url, name: file.name }]);
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "이미지 업로드 실패";
            setError(msg);
        }
    }, [editImages.length]);

    const removeImage = useCallback((index: number) => {
        setEditImages((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const addImageToNew = useCallback(async (file: File) => {
        if (newImages.length >= MAX_IMAGES) {
            setError(`이미지는 최대 ${MAX_IMAGES}개까지입니다.`);
            return;
        }
        try {
            const { url } = await uploadImage(file);
            setNewImages((prev) => [...prev, { url, name: file.name }]);
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "이미지 업로드 실패";
            setError(msg);
        }
    }, [newImages.length]);

    const removeNewImage = useCallback((index: number) => {
        setNewImages((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const handleNewBodyPaste = useCallback(
        async (e: React.ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.kind === "file" && item.type.startsWith("image/")) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file && newImages.length < MAX_IMAGES) {
                        try {
                            const { url } = await uploadImage(file);
                            setNewImages((prev) => [...prev, { url, name: file.name }]);
                        } catch (err) {
                            setError(err instanceof ApiError ? err.message : "이미지 업로드 실패");
                        }
                    }
                    return;
                }
            }
        },
        [newImages.length]
    );

    const handleEditBodyPaste = useCallback(
        async (e: React.ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.kind === "file" && item.type.startsWith("image/")) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file && editImages.length < MAX_IMAGES) {
                        try {
                            const { url } = await uploadImage(file);
                            setEditImages((prev) => [...prev, { url, name: file.name }]);
                        } catch (err) {
                            setError(err instanceof ApiError ? err.message : "이미지 업로드 실패");
                        }
                    }
                    return;
                }
            }
        },
        [editImages.length]
    );

    // Splitter 드래그 핸들러
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizingRef.current = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizingRef.current || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = e.clientX - containerRect.left;
            const minWidth = 250;
            const maxWidth = Math.max(600, containerRect.width * 0.7);
            setListWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
        };

        const handleMouseUp = () => {
            if (isResizingRef.current) {
                isResizingRef.current = false;
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            }
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                display: "flex",
                height: "calc(100vh - 32px)",
                minHeight: 400,
                border: "1px solid var(--app-border)",
                borderRadius: 8,
                overflow: "hidden",
                background: "var(--app-bg)",
                minWidth: 0,
            }}
        >
            {/* 좌측: 메모 목록 (드래그로 크기 조절 가능) */}
            <aside
                style={{
                    width: listWidth,
                    flexShrink: 0,
                    borderRight: "1px solid var(--app-border)",
                    display: "flex",
                    flexDirection: "column",
                    background: "var(--app-bg-sidebar)",
                    overflow: "hidden",
                    minWidth: 0,
                }}
            >
                <div
                    style={{
                        padding: 12,
                        borderBottom: "1px solid var(--app-border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    <span style={{ fontWeight: 700, fontSize: 16 }}>메모</span>
                    <button
                        type="button"
                        onClick={startNew}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 6,
                            border: "none",
                            textDecoration: "none",
                            color: "#fff",
                            background: "#3B82F6",
                            fontWeight: 500,
                            cursor: "pointer",
                        }}
                    >
                        새 메모
                    </button>
                </div>
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                    style={{
                        marginTop: 12,
                        padding: "0 8px 8px",
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        width: "100%",
                        boxSizing: "border-box",
                        minWidth: 0,
                        flexShrink: 0,
                    }}
                >
                    <input
                        type="text"
                        placeholder="검색어를 입력하세요."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid #444",
                            background: "#f5f5f5",
                            color: "#111",
                            outline: "none",
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid #444",
                            background: "#fff",
                            color: "#111",
                            fontWeight: 800,
                            cursor: "pointer",
                        }}
                    >
                        검색
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchInput("");
                            setKeyword("");
                        }}
                        style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid #444",
                            background: "#fff",
                            color: "#111",
                            fontWeight: 800,
                            cursor: "pointer",
                        }}
                    >
                        초기화
                    </button>
                </form>
                <div
                    style={{
                        flex: 1,
                        minHeight: 0,
                        minWidth: 0,
                        overflowY: "auto",
                        overflowX: "hidden",
                        paddingRight: 6,
                    }}
                >
                    {loading ? (
                        <div style={{ padding: 16, color: "var(--app-text)", opacity: 0.8 }}>불러오는 중...</div>
                    ) : (
                        <>
                            {list.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleSelect(m.id)}
                                    style={{
                                        width: "100%",
                                        maxWidth: "100%",
                                        boxSizing: "border-box",
                                        padding: "12px 10px",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 10,
                                        margin: "8px 6px 0 8px",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        background: selectedId === m.id ? "#fde68a" : "#fef9c3",
                                        color: "var(--app-text)",
                                        overflow: "hidden",
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                                    {m.bodyPreview && (
                                        <div style={{ fontSize: 12, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {m.bodyPreview}
                                        </div>
                                    )}
                                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                                        {formatMemoDate(m.updatedAt)}
                                        {m.updatedByName && <span style={{ marginLeft: 6 }}>· {m.updatedByName}</span>}
                                    </div>
                                </button>
                            ))}
                            {list.length === 0 && !loading && (
                                <div style={{ padding: 16, color: "var(--app-text)", opacity: 0.7 }}>메모가 없습니다.</div>
                            )}
                        </>
                    )}
                </div>
            </aside>

            {/* Splitter: 드래그로 크기 조절 */}
            <div
                onMouseDown={handleMouseDown}
                style={{
                    width: 4,
                    flexShrink: 0,
                    cursor: "col-resize",
                    background: "var(--app-border)",
                    position: "relative",
                    userSelect: "none",
                }}
                onMouseEnter={(e) => {
                    if (!isResizingRef.current) {
                        (e.currentTarget as HTMLElement).style.background = "#2563eb";
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isResizingRef.current) {
                        (e.currentTarget as HTMLElement).style.background = "var(--app-border)";
                    }
                }}
            />

            {/* 우측: 상세 / 편집 / 새 메모 (스크롤바 고려, 가로 넘침 방지) */}
            <main
                style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    background: "#fef9c3",
                    color: "#1c1917",
                }}
            >
                {creating && (
                    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
                        <input
                            type="text"
                            placeholder="제목"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            style={{
                                padding: "10px 12px",
                                border: "1px solid #a3a3a3",
                                borderRadius: 6,
                                fontSize: 15,
                                background: "#fff",
                            }}
                        />
                        <textarea
                            placeholder="내용 (이미지는 Ctrl+V로 붙여넣기 가능)"
                            value={newBody}
                            onChange={(e) => setNewBody(e.target.value)}
                            onPaste={handleNewBodyPaste}
                            style={{
                                flex: 1,
                                minHeight: 120,
                                padding: "10px 12px",
                                border: "1px solid #a3a3a3",
                                borderRadius: 6,
                                resize: "vertical",
                                background: "#fff",
                            }}
                        />
                        {newImages.length > 0 && (
                            <div>
                                <div style={{ fontSize: 12, marginBottom: 4 }}>이미지 (최대 {MAX_IMAGES}개)</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {newImages.map((img, i) => {
                                        const imageUrl = img.url.startsWith("http") || img.url.startsWith("//") 
                                            ? img.url 
                                            : `${API_BASE}${img.url.startsWith("/") ? "" : "/"}${img.url}`;
                                        return (
                                        <div key={i} style={{ position: "relative" }}>
                                            <img
                                                src={imageUrl}
                                                alt={img.name ?? ""}
                                                style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 4 }}
                                                onError={(e) => {
                                                    console.error("Failed to load image:", imageUrl);
                                                    (e.target as HTMLImageElement).style.display = "none";
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeNewImage(i)}
                                                style={{
                                                    position: "absolute",
                                                    top: 2,
                                                    right: 2,
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: "50%",
                                                    border: "none",
                                                    background: "rgba(0,0,0,0.6)",
                                                    color: "#fff",
                                                    cursor: "pointer",
                                                    fontSize: 12,
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {newImages.length < MAX_IMAGES && (
                            <label style={{ display: "inline-block" }}>
                                <span
                                    style={{
                                        padding: "6px 12px",
                                        border: "1px solid #444",
                                        borderRadius: 10,
                                        cursor: "pointer",
                                        fontSize: 13,
                                        background: "#fff",
                                        fontWeight: 800,
                                    }}
                                >
                                    이미지 추가
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) addImageToNew(f);
                                        e.target.value = "";
                                    }}
                                />
                            </label>
                        )}
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button
                                type="button"
                                onClick={cancelNew}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 10,
                                    border: "1px solid #444",
                                    background: "var(--app-btn-secondary-bg)",
                                    color: "var(--app-btn-secondary-text)",
                                    fontWeight: 800,
                                    cursor: "pointer",
                                }}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={saveNew}
                                disabled={saving || !newTitle.trim()}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 10,
                                    border: "1px solid #444",
                                    background: saving ? "#999" : "#2563eb",
                                    color: "#fff",
                                    fontWeight: 800,
                                    cursor: saving ? "not-allowed" : "pointer",
                                }}
                            >
                                {saving ? "저장 중..." : "저장"}
                            </button>
                        </div>
                    </div>
                )}

                {!creating && selectedId == null && !detailLoading && (
                    <div style={{ padding: 24, color: "#78716c", textAlign: "center" }}>
                        좌측에서 메모를 선택하거나 새 메모를 만드세요.
                    </div>
                )}

                {!creating && detailLoading && (
                    <div style={{ padding: 24 }}>불러오는 중...</div>
                )}

                {!creating && detail && selectedId != null && (
                    <div style={{ padding: 20, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                        {editing ? (
                            <>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    style={{
                                        padding: "10px 12px",
                                        border: "1px solid #a3a3a3",
                                        borderRadius: 6,
                                        fontSize: 15,
                                        marginBottom: 12,
                                        background: "#fff",
                                    }}
                                />
                                <textarea
                                    value={editBody}
                                    onChange={(e) => setEditBody(e.target.value)}
                                    onPaste={handleEditBodyPaste}
                                    style={{
                                        flex: 1,
                                        minHeight: 120,
                                        padding: "10px 12px",
                                        border: "1px solid #a3a3a3",
                                        borderRadius: 6,
                                        resize: "vertical",
                                        background: "#fff",
                                    }}
                                />
                                {editImages.length > 0 && (
                                    <div style={{ marginTop: 8 }}>
                                        <div style={{ fontSize: 12, marginBottom: 4 }}>이미지 (최대 {MAX_IMAGES}개)</div>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                            {editImages.map((img, i) => {
                                                const imageUrl = img.url.startsWith("http") || img.url.startsWith("//") 
                                                    ? img.url 
                                                    : `${API_BASE}${img.url.startsWith("/") ? "" : "/"}${img.url}`;
                                                return (
                                                <div key={i} style={{ position: "relative" }}>
                                                    <img
                                                        src={imageUrl}
                                                        alt={img.name ?? ""}
                                                        style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 4 }}
                                                        onError={(e) => {
                                                            console.error("Failed to load image:", imageUrl);
                                                            (e.target as HTMLImageElement).style.display = "none";
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(i)}
                                                        style={{
                                                            position: "absolute",
                                                            top: 2,
                                                            right: 2,
                                                            width: 20,
                                                            height: 20,
                                                            borderRadius: "50%",
                                                            border: "none",
                                                            background: "rgba(0,0,0,0.6)",
                                                            color: "#fff",
                                                            cursor: "pointer",
                                                            fontSize: 12,
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {editImages.length < MAX_IMAGES && (
                                    <label style={{ display: "inline-block", marginTop: 8 }}>
                                        <span
                                            style={{
                                                padding: "6px 12px",
                                                border: "1px solid var(--app-border)",
                                                borderRadius: 6,
                                                cursor: "pointer",
                                                fontSize: 13,
                                                background: "var(--app-btn-secondary-bg)",
                                            }}
                                        >
                                            이미지 추가
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) addImage(f);
                                                e.target.value = "";
                                            }}
                                        />
                                    </label>
                                )}
                                <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        style={{
                                            padding: "10px 14px",
                                            borderRadius: 10,
                                            border: "1px solid #444",
                                            background: "var(--app-btn-secondary-bg)",
                                            color: "var(--app-btn-secondary-text)",
                                            fontWeight: 800,
                                            cursor: "pointer",
                                        }}
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="button"
                                        onClick={saveEdit}
                                        disabled={saving || !editTitle.trim()}
                                        style={{
                                            padding: "10px 14px",
                                            borderRadius: 10,
                                            border: "1px solid #444",
                                            background: saving ? "#999" : "#2563eb",
                                            color: "#fff",
                                            fontWeight: 800,
                                            cursor: saving ? "not-allowed" : "pointer",
                                        }}
                                    >
                                        {saving ? "저장 중..." : "저장"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{detail.title}</h2>
                                    <div className="header-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch" }}>
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            disabled={saving}
                                            style={{
                                                width: 90,
                                                minHeight: 42,
                                                padding: "10px 14px",
                                                borderRadius: 10,
                                                border: "1px solid #dc2626",
                                                color: "#fff",
                                                background: saving ? "#999" : "#dc2626",
                                                fontWeight: 800,
                                                boxSizing: "border-box",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: saving ? "not-allowed" : "pointer",
                                            }}
                                        >
                                            {saving ? "삭제 중..." : "삭제"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={startEdit}
                                            style={{
                                                width: 90,
                                                minHeight: 42,
                                                padding: "10px 14px",
                                                borderRadius: 10,
                                                border: "1px solid #444",
                                                color: "#fff",
                                                background: "#2563eb",
                                                fontWeight: 800,
                                                boxSizing: "border-box",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: "pointer",
                                            }}
                                        >
                                            수정
                                        </button>
                                    </div>
                                </div>
                                {/* 우측 본문/이미지 스크롤 영역 (스크롤바가 항상 이 영역에 생기도록) */}
                                <div
                                    style={{
                                        flex: 1,
                                        overflowY: "auto",
                                        paddingRight: 8,
                                        scrollbarGutter: "stable",
                                    }}
                                >
                                    <div
                                        style={{
                                            whiteSpace: "pre-wrap",
                                            lineHeight: 1.6,
                                            fontSize: 14,
                                        }}
                                    >
                                        {detail.body || "(내용 없음)"}
                                    </div>
                                    {parseImagesJson(detail.images).length > 0 && (
                                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                                            {parseImagesJson(detail.images).map((img, i) => {
                                                // 상대 경로인 경우 API_BASE를 붙여서 전체 URL 생성
                                                const imageUrl = img.url.startsWith("http") || img.url.startsWith("//") 
                                                    ? img.url 
                                                    : `${API_BASE}${img.url.startsWith("/") ? "" : "/"}${img.url}`;
                                                return (
                                                    <img
                                                        key={i}
                                                        src={imageUrl}
                                                        alt={img.name ?? ""}
                                                        onClick={() => setModalImage({ ...img, url: imageUrl })}
                                                        style={{
                                                            width: "100%",
                                                            maxWidth: "100%",
                                                            height: "auto",
                                                            objectFit: "contain",
                                                            borderRadius: 4,
                                                            cursor: "pointer",
                                                            border: "1px solid #e5e7eb",
                                                        }}
                                                        onError={(e) => {
                                                            // 이미지 로드 실패 시 에러 처리
                                                            console.error("Failed to load image:", imageUrl);
                                                            (e.target as HTMLImageElement).style.display = "none";
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
                                    수정한 날짜: {formatMemoDate(detail.updatedAt)}
                                {detail.updatedByName && <span style={{ marginLeft: 8 }}>· {detail.updatedByName}</span>}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>

            {/* 이미지 모달 팝업 */}
            {modalImage && (
                <div
                    onClick={() => setModalImage(null)}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0, 0, 0, 0.9)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10000,
                        cursor: "pointer",
                        padding: 20,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: "relative",
                            maxWidth: "90vw",
                            maxHeight: "90vh",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <img
                            src={modalImage.url.startsWith("http") || modalImage.url.startsWith("//") 
                                ? modalImage.url 
                                : `${API_BASE}${modalImage.url.startsWith("/") ? "" : "/"}${modalImage.url}`}
                            alt={modalImage.name ?? ""}
                            style={{
                                maxWidth: "100%",
                                maxHeight: "90vh",
                                objectFit: "contain",
                                borderRadius: 8,
                            }}
                            onError={(e) => {
                                console.error("Failed to load modal image:", modalImage.url);
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                        <button
                            onClick={() => setModalImage(null)}
                            style={{
                                position: "absolute",
                                top: 10,
                                right: 10,
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                border: "none",
                                background: "rgba(0, 0, 0, 0.7)",
                                color: "#fff",
                                cursor: "pointer",
                                fontSize: 24,
                                fontWeight: "bold",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                lineHeight: 1,
                            }}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
            <ErrorModal open={!!error} message={error ?? ""} onClose={() => setError(null)} />
        </div>
    );
}
