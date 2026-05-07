import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
    fetchAdminContentStats,
    fetchAdminContentStatsMemos,
    fetchAdminContentStatsPosts,
    type AdminContentStatsResponse,
    type CategoryPostCountRow,
    type MemoStatListItem,
    type PostStatListItem,
} from "../lib/api";
import { ApiError } from "../lib/api";
import { isAdmin } from "../lib/auth";
import ErrorModal from "../components/ErrorModal";

function formatLocalYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function defaultWeekRangeEnd(): string {
    return formatLocalYmd(new Date());
}

function defaultWeekRangeStart(): string {
    const end = new Date();
    const start = new Date(end.getTime());
    start.setDate(end.getDate() - 7);
    return formatLocalYmd(start);
}

function formatListDate(iso: string): string {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
}

function statCell(v: number | null | undefined): string {
    if (v === null || v === undefined) return "—";
    return String(v);
}

function netCellStyle(v: number | null | undefined): CSSProperties {
    if (v === null || v === undefined) return { fontVariantNumeric: "tabular-nums" };
    if (v < 0) return { fontVariantNumeric: "tabular-nums", color: "#b91c1c", fontWeight: 700 };
    if (v > 0) return { fontVariantNumeric: "tabular-nums", color: "#15803d", fontWeight: 600 };
    return { fontVariantNumeric: "tabular-nums", color: "#6b7280" };
}

type PostModalState = {
    title: string;
    uncategorized: boolean;
    categoryIds: number[];
};

const linkLikeBtn: CSSProperties = {
    display: "inline",
    padding: 0,
    margin: 0,
    border: "none",
    background: "none",
    font: "inherit",
    fontWeight: "inherit",
    color: "#2563eb",
    cursor: "pointer",
    textAlign: "left",
    textDecoration: "underline",
    textUnderlineOffset: 2,
};

export default function AdminContentStatsPage() {
    const [start, setStart] = useState(() => defaultWeekRangeStart());
    const [end, setEnd] = useState(() => defaultWeekRangeEnd());
    const [data, setData] = useState<AdminContentStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [postModal, setPostModal] = useState<PostModalState | null>(null);
    const [postList, setPostList] = useState<PostStatListItem[]>([]);
    const [postListLoading, setPostListLoading] = useState(false);
    const [postModalError, setPostModalError] = useState<string | null>(null);
    const [memoModalOpen, setMemoModalOpen] = useState(false);
    const [memoList, setMemoList] = useState<MemoStatListItem[]>([]);
    const [memoListLoading, setMemoListLoading] = useState(false);
    const [memoModalError, setMemoModalError] = useState<string | null>(null);
    const [deletionReasonModal, setDeletionReasonModal] = useState<{ title: string; reason: string } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const s = start.trim();
        const e = end.trim();
        if ((s && !e) || (!s && e)) {
            setError("기간으로 조회하려면 시작일과 종료일을 모두 선택해 주세요.");
            setLoading(false);
            return;
        }
        try {
            const res = await fetchAdminContentStats(s && e ? { start: s, end: e } : {});
            setData(res);
        } catch (e) {
            const msg =
                e instanceof ApiError ? e.message : e instanceof Error ? e.message : "조회에 실패했습니다.";
            setError(msg);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [start, end]);

    useEffect(() => {
        if (!isAdmin()) return;
        load();
    }, [load]);

    const openCategoryPosts = async (row: CategoryPostCountRow) => {
        const s = start.trim();
        const e = end.trim();
        const period = s && e ? { start: s, end: e } : {};
        setPostModal({
            title: row.label,
            uncategorized: false,
            categoryIds: row.postFilterCategoryIds ?? [],
        });
        setPostList([]);
        setPostModalError(null);
        setPostListLoading(true);
        try {
            const ids = row.postFilterCategoryIds ?? [];
            if (ids.length === 0) {
                setPostModalError("이 카테고리에 대한 필터 정보가 없어 목록을 불러올 수 없습니다.");
                return;
            }
            const list = await fetchAdminContentStatsPosts({
                categoryIds: ids,
                ...period,
            });
            setPostList(list);
        } catch (e) {
            const msg =
                e instanceof ApiError ? e.message : e instanceof Error ? e.message : "목록을 불러오지 못했습니다.";
            setPostModalError(msg);
        } finally {
            setPostListLoading(false);
        }
    };

    const openUncategorizedPosts = async () => {
        const s = start.trim();
        const e = end.trim();
        const period = s && e ? { start: s, end: e } : {};
        setPostModal({
            title: "카테고리 미지정",
            uncategorized: true,
            categoryIds: [],
        });
        setPostList([]);
        setPostModalError(null);
        setPostListLoading(true);
        try {
            const list = await fetchAdminContentStatsPosts({
                uncategorized: true,
                ...period,
            });
            setPostList(list);
        } catch (e) {
            const msg =
                e instanceof ApiError ? e.message : e instanceof Error ? e.message : "목록을 불러오지 못했습니다.";
            setPostModalError(msg);
        } finally {
            setPostListLoading(false);
        }
    };

    const closePostModal = () => {
        setPostModal(null);
        setPostList([]);
        setPostModalError(null);
        setDeletionReasonModal(null);
    };

    const openMemoList = async () => {
        const s = start.trim();
        const e = end.trim();
        const period = s && e ? { start: s, end: e } : {};
        setMemoModalOpen(true);
        setMemoList([]);
        setMemoModalError(null);
        setMemoListLoading(true);
        try {
            const list = await fetchAdminContentStatsMemos(period);
            setMemoList(list);
        } catch (err) {
            const msg =
                err instanceof ApiError ? err.message : err instanceof Error ? err.message : "목록을 불러오지 못했습니다.";
            setMemoModalError(msg);
        } finally {
            setMemoListLoading(false);
        }
    };

    const closeMemoModal = () => {
        setMemoModalOpen(false);
        setMemoList([]);
        setMemoModalError(null);
        setDeletionReasonModal(null);
    };

    if (!isAdmin()) {
        return (
            <div style={{ padding: 24 }}>
                <p style={{ color: "#dc2626" }}>관리자만 접근할 수 있습니다.</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 960 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800 }}>게시글 통계</h1>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>
                상위·하위 카테고리별로 누계(현재 비삭제), 기간 선택 시 증가(생성일 기준 신규), 감소(삭제 처리 시각·DB의 updated_at 근사), 순증감(증가−감소, 음수 가능)을 확인합니다. 상위 행은 해당 하위까지 합산합니다. 카테고리 이름을 누르면 해당 범위의 게시글 목록을 볼 수 있습니다. 메모 행은 별도 테이블로 집계되며, 메모 제목을 누르면 기간 내 신규·삭제 보관 목록을 볼 수 있습니다.
            </p>

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "flex-end",
                    marginBottom: 20,
                    padding: 16,
                    background: "#f9fafb",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                }}
            >
                <div>
                    <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>시작일</label>
                    <input
                        type="date"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 }}
                    />
                </div>
                <div>
                    <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>종료일</label>
                    <input
                        type="date"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 }}
                    />
                </div>
                <button
                    type="button"
                    onClick={load}
                    disabled={loading}
                    style={{
                        padding: "10px 16px",
                        borderRadius: 6,
                        border: "none",
                        background: loading ? "#9ca3af" : "#3B82F6",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: loading ? "not-allowed" : "pointer",
                    }}
                >
                    {loading ? "조회 중…" : "조회"}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setStart(defaultWeekRangeStart());
                        setEnd(defaultWeekRangeEnd());
                    }}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 6,
                        border: "1px solid #d1d5db",
                        background: "#fff",
                        color: "#374151",
                        cursor: "pointer",
                    }}
                >
                    기간 초기화
                </button>
            </div>

            {data && (
                <p style={{ fontSize: 13, color: "#374151", marginBottom: 12 }}>
                    {data.dateFilterApplied
                        ? `조회 기간: ${data.rangeStart ?? ""} ~ ${data.rangeEnd ?? ""} (등록일 기준, 시작일 00:00 ~ 종료일 23:59:59)`
                        : "기간 미선택: 전체 누적 기준으로 표시됩니다. 시작일·종료일을 모두 선택한 뒤 조회하면 해당 기간만 집계합니다."}
                </p>
            )}

            {loading && <div style={{ opacity: 0.8 }}>불러오는 중...</div>}

            {!loading && data && (
                <>
                    <div style={{ marginTop: 8, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
                                    <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600 }}>구분</th>
                                    <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600 }}>카테고리</th>
                                    <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600 }}>누계</th>
                                    <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600 }}>증가</th>
                                    <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600 }}>감소</th>
                                    <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600 }}>순증감</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#f0f9ff", fontWeight: 700 }}>
                                    <td style={{ padding: "10px 14px", color: "#1e3a8a", fontSize: 13 }}>총계</td>
                                    <td style={{ padding: "10px 14px", color: "#1e3a8a" }}>전체</td>
                                    <td
                                        style={{
                                            padding: "10px 14px",
                                            textAlign: "right",
                                            fontVariantNumeric: "tabular-nums",
                                            color: "#1d4ed8",
                                        }}
                                    >
                                        {data.totalPostCount}
                                    </td>
                                    <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#1d4ed8" }}>
                                        {statCell(data.totalCreatedInPeriod)}
                                    </td>
                                    <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#1d4ed8" }}>
                                        {statCell(data.totalDeletedInPeriod)}
                                    </td>
                                    <td style={{ padding: "10px 14px", textAlign: "right", ...netCellStyle(data.totalNetChangeInPeriod) }}>
                                        {statCell(data.totalNetChangeInPeriod)}
                                    </td>
                                </tr>
                                {data.rows.map((row) => (
                                    <tr key={row.categoryId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                        <td style={{ padding: "10px 14px", color: "#6b7280", fontSize: 13 }}>
                                            {row.depth === 0 ? "상위" : "하위"}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 14px",
                                                paddingLeft: row.depth === 1 ? 32 : 14,
                                            }}
                                        >
                                            <button type="button" style={linkLikeBtn} onClick={() => openCategoryPosts(row)}>
                                                {row.label}
                                            </button>
                                        </td>
                                        <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{row.postCount}</td>
                                        <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                            {statCell(row.createdInPeriod)}
                                        </td>
                                        <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                            {statCell(row.deletedInPeriod)}
                                        </td>
                                        <td style={{ padding: "10px 14px", textAlign: "right", ...netCellStyle(row.netChangeInPeriod) }}>
                                            {statCell(row.netChangeInPeriod)}
                                        </td>
                                    </tr>
                                ))}
                                <tr style={{ background: "#fefce8" }}>
                                    <td style={{ padding: "10px 14px", color: "#6b7280", fontSize: 13 }}>—</td>
                                    <td style={{ padding: "10px 14px" }}>
                                        <button type="button" style={{ ...linkLikeBtn, fontWeight: 500 }} onClick={openUncategorizedPosts}>
                                            카테고리 미지정
                                        </button>
                                    </td>
                                    <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                        {data.uncategorizedPostCount}
                                    </td>
                                    <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                        {statCell(data.uncategorizedCreatedInPeriod)}
                                    </td>
                                    <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                        {statCell(data.uncategorizedDeletedInPeriod)}
                                    </td>
                                    <td style={{ padding: "10px 14px", textAlign: "right", ...netCellStyle(data.uncategorizedNetChangeInPeriod) }}>
                                        {statCell(data.uncategorizedNetChangeInPeriod)}
                                    </td>
                                </tr>
                                <tr style={{ background: "#eff6ff", borderTop: "1px solid #e5e7eb" }}>
                                    <td style={{ padding: "10px 14px", color: "#1e3a8a", fontSize: 13 }}>메모</td>
                                    <td style={{ padding: "10px 14px" }}>
                                        <button type="button" style={{ ...linkLikeBtn, fontWeight: 600 }} onClick={openMemoList}>
                                            메모 (목록)
                                        </button>
                                    </td>
                                    <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#1d4ed8" }}>
                                        {data.memoCumulativeCount}
                                    </td>
                                    <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#1d4ed8" }}>
                                        {statCell(data.memoCreatedInPeriod)}
                                    </td>
                                    <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#1d4ed8" }}>
                                        {statCell(data.memoDeletedInPeriod)}
                                    </td>
                                    <td style={{ padding: "10px 14px", textAlign: "right", ...netCellStyle(data.memoNetChangeInPeriod) }}>
                                        {statCell(data.memoNetChangeInPeriod)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {postModal && (
                <div
                    role="presentation"
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.45)",
                        zIndex: 10002,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 16,
                    }}
                    onMouseDown={(ev) => {
                        if (ev.target === ev.currentTarget) closePostModal();
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="content-stats-post-modal-title"
                        style={{
                            width: "min(560px, 100%)",
                            maxHeight: "min(80vh, 640px)",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            background: "#fff",
                            borderRadius: 10,
                            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                padding: "14px 18px",
                                borderBottom: "1px solid #e5e7eb",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                            }}
                        >
                            <h2 id="content-stats-post-modal-title" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                                {postModal.title}
                            </h2>
                            <button
                                type="button"
                                onClick={closePostModal}
                                aria-label="닫기"
                                style={{
                                    border: "none",
                                    background: "#f3f4f6",
                                    borderRadius: 8,
                                    width: 36,
                                    height: 36,
                                    cursor: "pointer",
                                    fontSize: 18,
                                    lineHeight: 1,
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <div style={{ padding: "12px 18px 18px", overflow: "auto", flex: 1 }}>
                            {postModalError && (
                                <p style={{ margin: "0 0 12px", color: "#b91c1c", fontSize: 14 }}>{postModalError}</p>
                            )}
                            {postListLoading && <p style={{ margin: 0, color: "#6b7280" }}>목록을 불러오는 중…</p>}
                            {!postListLoading && !postModalError && postList.length === 0 && (
                                <p style={{ margin: 0, color: "#6b7280" }}>해당 조건의 게시글이 없습니다.</p>
                            )}
                            {!postListLoading && postList.length > 0 && (
                                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                                    {postList.map((p) => {
                                        const isDeleted = p.deleted === true;
                                        const reason = (p.deletionReason ?? "").trim();
                                        return (
                                            <li
                                                key={p.id}
                                                style={{
                                                    padding: "10px 12px",
                                                    margin: "0 -6px",
                                                    borderRadius: 8,
                                                    borderBottom: "1px solid #f3f4f6",
                                                    background: isDeleted ? "#fef2f2" : undefined,
                                                    borderLeft: isDeleted ? "3px solid #dc2626" : "3px solid transparent",
                                                }}
                                            >
                                                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                                                    {isDeleted ? (
                                                        <span style={{ fontWeight: 600, color: "#991b1b" }}>
                                                            {p.title || "(제목 없음)"}
                                                        </span>
                                                    ) : (
                                                        <Link
                                                            to={`/posts/${p.id}`}
                                                            onClick={closePostModal}
                                                            style={{ fontWeight: 600, color: "#1d4ed8", textDecoration: "none" }}
                                                        >
                                                            {p.title || "(제목 없음)"}
                                                        </Link>
                                                    )}
                                                    {isDeleted && (
                                                        <span
                                                            style={{
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                                color: "#fff",
                                                                background: "#dc2626",
                                                                padding: "2px 8px",
                                                                borderRadius: 4,
                                                            }}
                                                        >
                                                            삭제됨
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                                                    {formatListDate(p.createdAt)} · {p.categoryLabel}
                                                </div>
                                                {isDeleted && reason && (
                                                    <div style={{ marginTop: 8 }}>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDeletionReasonModal({
                                                                    title: p.title || "(제목 없음)",
                                                                    reason,
                                                                })
                                                            }
                                                            style={{
                                                                ...linkLikeBtn,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                color: "#b91c1c",
                                                            }}
                                                        >
                                                            삭제 사유 보기
                                                        </button>
                                                    </div>
                                                )}
                                                {isDeleted && !reason && (
                                                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>삭제 사유 없음</div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {memoModalOpen && (
                <div
                    role="presentation"
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.45)",
                        zIndex: 10002,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 16,
                    }}
                    onMouseDown={(ev) => {
                        if (ev.target === ev.currentTarget) closeMemoModal();
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="content-stats-memo-modal-title"
                        style={{
                            width: "min(560px, 100%)",
                            maxHeight: "min(80vh, 640px)",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            background: "#fff",
                            borderRadius: 10,
                            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                padding: "14px 18px",
                                borderBottom: "1px solid #e5e7eb",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                            }}
                        >
                            <h2 id="content-stats-memo-modal-title" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                                메모
                            </h2>
                            <button
                                type="button"
                                onClick={closeMemoModal}
                                aria-label="닫기"
                                style={{
                                    border: "none",
                                    background: "#f3f4f6",
                                    borderRadius: 8,
                                    width: 36,
                                    height: 36,
                                    cursor: "pointer",
                                    fontSize: 18,
                                    lineHeight: 1,
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <div style={{ padding: "12px 18px 18px", overflow: "auto", flex: 1 }}>
                            {memoModalError && (
                                <p style={{ margin: "0 0 12px", color: "#b91c1c", fontSize: 14 }}>{memoModalError}</p>
                            )}
                            {memoListLoading && <p style={{ margin: 0, color: "#6b7280" }}>목록을 불러오는 중…</p>}
                            {!memoListLoading && !memoModalError && memoList.length === 0 && (
                                <p style={{ margin: 0, color: "#6b7280" }}>해당 조건의 메모가 없습니다.</p>
                            )}
                            {!memoListLoading && memoList.length > 0 && (
                                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                                    {memoList.map((m) => {
                                        const isDeleted = m.deleted === true;
                                        const reason = (m.deletionReason ?? "").trim();
                                        return (
                                            <li
                                                key={m.listKey}
                                                style={{
                                                    padding: "10px 12px",
                                                    margin: "0 -6px",
                                                    borderRadius: 8,
                                                    borderBottom: "1px solid #f3f4f6",
                                                    background: isDeleted ? "#fef2f2" : undefined,
                                                    borderLeft: isDeleted ? "3px solid #dc2626" : "3px solid transparent",
                                                }}
                                            >
                                                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                                                    {isDeleted ? (
                                                        <span style={{ fontWeight: 600, color: "#991b1b" }}>
                                                            {m.title || "(제목 없음)"}
                                                        </span>
                                                    ) : (
                                                        <Link
                                                            to="/memos"
                                                            onClick={closeMemoModal}
                                                            style={{ fontWeight: 600, color: "#1d4ed8", textDecoration: "none" }}
                                                        >
                                                            {m.title || "(제목 없음)"}
                                                        </Link>
                                                    )}
                                                    {isDeleted && (
                                                        <span
                                                            style={{
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                                color: "#fff",
                                                                background: "#dc2626",
                                                                padding: "2px 8px",
                                                                borderRadius: 4,
                                                            }}
                                                        >
                                                            삭제됨
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                                                    등록 {formatListDate(m.createdAt)} · 메모
                                                    {isDeleted && m.deletedAt && (
                                                        <> · 삭제 {formatListDate(m.deletedAt)}</>
                                                    )}
                                                </div>
                                                {isDeleted && reason && (
                                                    <div style={{ marginTop: 8 }}>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDeletionReasonModal({
                                                                    title: m.title || "(제목 없음)",
                                                                    reason,
                                                                })
                                                            }
                                                            style={{
                                                                ...linkLikeBtn,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                color: "#b91c1c",
                                                            }}
                                                        >
                                                            삭제 사유 보기
                                                        </button>
                                                    </div>
                                                )}
                                                {isDeleted && !reason && (
                                                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>삭제 사유 없음</div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {deletionReasonModal && (
                <div
                    role="presentation"
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.5)",
                        zIndex: 10004,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 16,
                    }}
                    onMouseDown={(ev) => {
                        if (ev.target === ev.currentTarget) setDeletionReasonModal(null);
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="deletion-reason-modal-title"
                        style={{
                            width: "min(480px, 100%)",
                            maxHeight: "min(70vh, 480px)",
                            overflow: "auto",
                            background: "#fff",
                            borderRadius: 10,
                            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
                            padding: "18px 20px",
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                            <h2 id="deletion-reason-modal-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#991b1b" }}>
                                삭제 사유
                            </h2>
                            <button
                                type="button"
                                onClick={() => setDeletionReasonModal(null)}
                                aria-label="닫기"
                                style={{
                                    border: "none",
                                    background: "#f3f4f6",
                                    borderRadius: 8,
                                    width: 36,
                                    height: 36,
                                    cursor: "pointer",
                                    fontSize: 18,
                                    lineHeight: 1,
                                    flexShrink: 0,
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <p style={{ margin: "0 0 10px", fontSize: 13, color: "#6b7280", fontWeight: 600 }}>{deletionReasonModal.title}</p>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 14,
                                color: "#111827",
                                lineHeight: 1.6,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                            }}
                        >
                            {deletionReasonModal.reason}
                        </p>
                    </div>
                </div>
            )}

            <ErrorModal open={!!error} message={error ?? ""} onClose={() => setError(null)} />
        </div>
    );
}
