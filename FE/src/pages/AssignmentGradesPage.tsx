import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAdminAssignmentGrades, fetchUsers, type AdminAssignmentGradesResponse, type UserItem } from "../lib/api";
import { isAdmin } from "../lib/auth";
import ErrorModal from "../components/ErrorModal";

const DIFFICULTY_LABEL: Record<string, string> = { HIGH: "상", MEDIUM: "중", LOW: "하" };

const STATUS_LABEL: Record<string, string> = {
    DRAFT: "미제출",
    SUBMITTED: "제출 완료",
    GRADED: "평가 완료",
};

/** API에서 올 수 있는 상태값(영문/한글)을 enum 형태로 통일 */
function normalizeStatus(s: string | undefined): string {
    if (s == null || s === "") return "";
    const u = String(s).toUpperCase();
    if (u === "DRAFT") return "DRAFT";
    if (u === "SUBMITTED") return "SUBMITTED";
    if (u === "GRADED") return "GRADED";
    if (s === "미제출") return "DRAFT";
    if (s === "제출 완료") return "SUBMITTED";
    if (s === "평가 완료") return "GRADED";
    return u;
}

type StatusFilter = "ALL" | "DRAFT" | "SUBMITTED" | "GRADED";

export default function AssignmentGradesPage() {
    const navigate = useNavigate();
    const [data, setData] = useState<AdminAssignmentGradesResponse | null>(null);
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [assignmentKeyword, setAssignmentKeyword] = useState("");

    const load = useCallback(async () => {
        if (!isAdmin()) return;
        setLoading(true);
        setError(null);
        try {
            const params = userId != null ? { userId } : undefined;
            const [gradesRes, usersRes] = await Promise.all([
                fetchAdminAssignmentGrades(params),
                fetchUsers(),
            ]);
            setData(gradesRes);
            setUsers(usersRes ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : "실습 채점 조회에 실패했습니다.");
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        load();
    }, [load]);

    const filteredByUser = useMemo(() => {
        if (!data?.byUser?.length) return [];
        let list = data.byUser;
        if (statusFilter !== "ALL") {
            list = list.filter((r) => normalizeStatus(r.status) === statusFilter);
        }
        const kw = assignmentKeyword.trim().toLowerCase();
        if (kw) {
            list = list.filter((r) => (r.postTitle ?? "").toLowerCase().includes(kw));
        }
        return list;
    }, [data?.byUser, statusFilter, assignmentKeyword]);

    const filteredAllSubmissions = useMemo(() => {
        let list = data?.allSubmissions ?? [];
        if (!list.length) return [];
        if (statusFilter !== "ALL") {
            list = list.filter((r) => normalizeStatus(r.status) === statusFilter);
        }
        const kw = assignmentKeyword.trim().toLowerCase();
        if (kw) {
            list = list.filter((r) => (r.postTitle ?? "").toLowerCase().includes(kw));
        }
        return list;
    }, [data?.allSubmissions, statusFilter, assignmentKeyword]);

    const selectableUsers = useMemo(() => users.filter((u) => u.role !== "ADMIN"), [users]);
    const userName = userId != null ? (selectableUsers.find((u) => u.id === userId)?.name ?? "") : "";

    useEffect(() => {
        if (userId != null && !selectableUsers.some((u) => u.id === userId)) setUserId(null);
    }, [userId, selectableUsers]);

    if (!isAdmin()) {
        return (
            <div style={{ padding: 24 }}>
                <p style={{ color: "#dc2626" }}>관리자만 접근할 수 있습니다.</p>
            </div>
        );
    }

    const handleSearch = () => {
        load();
    };

    const handleReset = () => {
        setUserId(null);
        setStatusFilter("ALL");
        setAssignmentKeyword("");
    };

    return (
        <div style={{ padding: 0, width: "100%", minWidth: 0, maxWidth: "none", boxSizing: "border-box" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
                실습 채점 조회
            </h1>

            {/* 검색 필터 영역 - 이미지3 기준: 1행 상태 구분·사용자·실습명·검색/초기화, 2행 실습 */}
            <div
                style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 20,
                    marginBottom: 24,
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                }}
            >
                {/* 1행: 상태 구분, 사용자, 실습명(가변), 검색, 초기화 */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 12,
                        width: "100%",
                        flexWrap: "wrap",
                    }}
                >
                    <label style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        상태 구분
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, minWidth: 140, background: "#fff" }}
                        >
                            <option value="ALL">전체</option>
                            <option value="DRAFT">미제출</option>
                            <option value="SUBMITTED">제출 완료</option>
                            <option value="GRADED">평가 완료</option>
                        </select>
                    </label>
                    <label style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        사용자
                        <select
                            value={userId ?? ""}
                            onChange={(e) => {
                                const v = e.target.value === "" ? null : Number(e.target.value);
                                setUserId(v);
                            }}
                            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, minWidth: 180, background: "#fff" }}
                        >
                            <option value="">전체 (선택 안 함)</option>
                            {selectableUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({u.username})
                                </option>
                            ))}
                        </select>
                    </label>
                    <label style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, flex: "1 1 200px", minWidth: 0 }}>
                        실습명
                        <input
                            type="text"
                            placeholder="실습 명 검색"
                            value={assignmentKeyword}
                            onChange={(e) => setAssignmentKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            style={{ flex: 1, minWidth: 0, padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, background: "#fff" }}
                        />
                    </label>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button
                            type="button"
                            onClick={handleSearch}
                            style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontWeight: 500, cursor: "pointer", fontSize: 14 }}
                        >
                            검색
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontWeight: 500, cursor: "pointer", fontSize: 14 }}
                        >
                            초기화
                        </button>
                    </div>
                </div>

                <p style={{ margin: 0, marginTop: 12, fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                    사용자별로 보려면 사용자를 선택하세요. 상태 구분과 실습 명으로 결과를 필터링할 수 있습니다.
                </p>
            </div>

            {loading ? (
                <p style={{ color: "#6b7280" }}>불러오는 중...</p>
            ) : userId != null && filteredByUser.length > 0 ? (
                <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", width: "100%" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ background: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>상태</th>
                                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>등록자</th>
                                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>게시글</th>
                                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>총점</th>
                                {data?.byUser?.[0]?.taskScores?.map((t) => (
                                    <th key={t.taskId} style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                                        {t.taskTitle}
                                        <span style={{ display: "block", fontSize: 11, color: "#6b7280", fontWeight: 400 }}>
                                            {DIFFICULTY_LABEL[t.difficulty] ?? t.difficulty} · {t.maxScore}점
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredByUser.map((row) => {
                                const detailUrl = `/posts/${row.postId}/assignment`;
                                return (
                                    <tr
                                        key={row.submissionId}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => navigate(detailUrl)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                navigate(detailUrl);
                                            }
                                        }}
                                        style={{
                                            borderBottom: "1px solid #e5e7eb",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <td style={{ padding: "10px 12px" }}>{STATUS_LABEL[normalizeStatus(row.status)] ?? row.status}</td>
                                        <td style={{ padding: "10px 12px" }}>{userName}</td>
                                        <td style={{ padding: "10px 12px" }}>{row.postTitle}</td>
                                        <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 500 }}>
                                            {row.totalScore} / {row.maxScore}
                                        </td>
                                        {row.taskScores?.map((t) => (
                                            <td key={t.taskId} style={{ padding: "10px 12px", textAlign: "center" }}>
                                                {t.score} / {t.maxScore}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : userId == null && data != null ? (
                <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", width: "100%" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ background: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>상태</th>
                                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>등록자</th>
                                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>게시글(실습명)</th>
                                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>총점</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAllSubmissions.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
                                        {statusFilter === "DRAFT"
                                            ? "조건에 맞는 미제출 실습이 없습니다. (백엔드가 제출 0건 실습을 allSubmissions에 포함해 반환하는지 확인하세요.)"
                                            : "제출된 실습이 없습니다. 사용자를 선택하면 해당 사용자별 목록을 볼 수 있습니다."}
                                    </td>
                                </tr>
                            ) : (
                                filteredAllSubmissions.map((row) => {
                                    const detailUrl = `/posts/${row.postId}/assignment`;
                                    return (
                                        <tr
                                            key={row.submissionId === 0 ? `no-sub-${row.postId}` : row.submissionId}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => navigate(detailUrl)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    navigate(detailUrl);
                                                }
                                            }}
                                            style={{
                                                borderBottom: "1px solid #e5e7eb",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <td style={{ padding: "10px 12px" }}>{STATUS_LABEL[normalizeStatus(row.status)] ?? row.status}</td>
                                            <td style={{ padding: "10px 12px" }}>{row.submitterName}</td>
                                            <td style={{ padding: "10px 12px" }}>{row.postTitle}</td>
                                            <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 500 }}>
                                                {row.totalScore} / {row.maxScore}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            ) : !loading && data ? (
                <div style={{ width: "100%", boxSizing: "border-box", padding: 24, textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: 8 }}>
                    {statusFilter === "DRAFT" ? "조건에 맞는 미제출 실습이 없습니다." : "조건에 맞는 제출이 없습니다."}
                </div>
            ) : null}
            <ErrorModal open={!!error} message={error ?? ""} onClose={() => setError(null)} />
        </div>
    );
}
