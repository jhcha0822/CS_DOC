import { useCallback, useEffect, useState } from "react";
import { fetchUsers, createUser, updateUser, deleteUser, type UserItem, type UserCreatePayload, type UserUpdatePayload } from "../lib/api";
import { ApiError } from "../lib/api";

export default function UserManagePage() {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // 새 사용자 폼
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newName, setNewName] = useState("");
    const [newRole, setNewRole] = useState<"ADMIN" | "USER">("USER");

    // 수정 폼
    const [editPassword, setEditPassword] = useState("");
    const [editName, setEditName] = useState("");
    const [editRole, setEditRole] = useState<"ADMIN" | "USER">("USER");

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await fetchUsers();
            setUsers(list || []);
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "사용자 목록을 불러오지 못했습니다.";
            setError(msg);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleCreate = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
            setError("사용자 ID, 비밀번호, 이름을 모두 입력하세요.");
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await createUser({
                username: newUsername.trim(),
                password: newPassword,
                name: newName.trim(),
                role: newRole,
            });
            setNewUsername("");
            setNewPassword("");
            setNewName("");
            setNewRole("USER");
            setCreating(false);
            await loadUsers();
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "사용자 추가에 실패했습니다.";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    }, [newUsername, newPassword, newName, newRole, loadUsers]);

    const handleStartEdit = useCallback((user: UserItem) => {
        setEditingId(user.id);
        setEditPassword("");
        setEditName(user.name);
        setEditRole(user.role);
    }, []);

    const handleCancelEdit = useCallback(() => {
        setEditingId(null);
        setEditPassword("");
        setEditName("");
        setEditRole("USER");
    }, []);

    const handleUpdate = useCallback(async (id: number) => {
        setSubmitting(true);
        setError(null);
        try {
            const payload: UserUpdatePayload = {
                role: editRole,
            };
            if (editPassword.trim()) {
                payload.password = editPassword.trim();
            }
            if (editName.trim()) {
                payload.name = editName.trim();
            }
            await updateUser(id, payload);
            setEditingId(null);
            setEditPassword("");
            setEditName("");
            await loadUsers();
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "사용자 수정에 실패했습니다.";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    }, [editPassword, editName, editRole, loadUsers]);

    const handleDelete = useCallback(async (id: number) => {
        if (!window.confirm("정말 이 사용자를 삭제하시겠습니까?")) {
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await deleteUser(id);
            await loadUsers();
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "사용자 삭제에 실패했습니다.";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    }, [loadUsers]);

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>사용자 관리</h1>
                {!creating && (
                    <button
                        type="button"
                        onClick={() => setCreating(true)}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid #444",
                            background: "#2563eb",
                            color: "#fff",
                            fontWeight: 800,
                            cursor: "pointer",
                        }}
                    >
                        사용자 추가
                    </button>
                )}
            </div>

            {error && (
                <div style={{ padding: 12, marginBottom: 16, background: "#fee2e2", color: "#991b1b", borderRadius: 8, border: "1px solid #fca5a5" }}>
                    {error}
                </div>
            )}

            {creating && (
                <form
                    onSubmit={handleCreate}
                    style={{
                        padding: 16,
                        marginBottom: 20,
                        border: "1px solid #444",
                        borderRadius: 10,
                        background: "#f9fafb",
                    }}
                >
                    <h3 style={{ marginTop: 0, marginBottom: 16 }}>새 사용자 추가</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 600 }}>
                                사용자 ID *
                            </label>
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="사용자 ID"
                                required
                                style={{
                                    width: "100%",
                                    maxWidth: 400,
                                    padding: "10px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #444",
                                    fontSize: 14,
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 600 }}>
                                사용자 이름 *
                            </label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="사용자 이름"
                                required
                                style={{
                                    width: "100%",
                                    maxWidth: 400,
                                    padding: "10px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #444",
                                    fontSize: 14,
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 600 }}>
                                비밀번호 *
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="비밀번호"
                                required
                                style={{
                                    width: "100%",
                                    maxWidth: 400,
                                    padding: "10px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #444",
                                    fontSize: 14,
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 600 }}>
                                권한 *
                            </label>
                            <select
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value as "ADMIN" | "USER")}
                                style={{
                                    width: "100%",
                                    maxWidth: 400,
                                    padding: "10px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #444",
                                    fontSize: 14,
                                }}
                            >
                                <option value="USER">USER</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 10,
                                    border: "1px solid #444",
                                    background: submitting ? "#999" : "#2563eb",
                                    color: "#fff",
                                    fontWeight: 800,
                                    cursor: submitting ? "not-allowed" : "pointer",
                                }}
                            >
                                {submitting ? "추가 중..." : "추가"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setCreating(false);
                                    setNewUsername("");
                                    setNewPassword("");
                                    setNewName("");
                                    setNewRole("USER");
                                }}
                                disabled={submitting}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 10,
                                    border: "1px solid #444",
                                    background: "#fff",
                                    color: "#111",
                                    fontWeight: 800,
                                    cursor: submitting ? "not-allowed" : "pointer",
                                }}
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {loading ? (
                <div style={{ padding: 20, textAlign: "center" }}>불러오는 중...</div>
            ) : (
                <div style={{ border: "1px solid #444", borderRadius: 10, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#f3f4f6" }}>
                                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #444", fontWeight: 700 }}>ID</th>
                                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #444", fontWeight: 700 }}>사용자 ID</th>
                                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #444", fontWeight: 700 }}>이름</th>
                                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #444", fontWeight: 700 }}>권한</th>
                                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #444", fontWeight: 700 }}>작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                    <td style={{ padding: "12px" }}>{user.id}</td>
                                    <td style={{ padding: "12px", fontWeight: 600 }}>{user.username}</td>
                                    <td style={{ padding: "12px" }}>
                                        {editingId === user.id ? (
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                placeholder="사용자 이름"
                                                required
                                                style={{
                                                    width: "100%",
                                                    maxWidth: 200,
                                                    padding: "6px 10px",
                                                    borderRadius: 6,
                                                    border: "1px solid #444",
                                                    fontSize: 13,
                                                }}
                                            />
                                        ) : (
                                            <span style={{ fontWeight: 600 }}>{user.name}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: "12px" }}>
                                        {editingId === user.id ? (
                                            <select
                                                value={editRole}
                                                onChange={(e) => setEditRole(e.target.value as "ADMIN" | "USER")}
                                                style={{
                                                    padding: "6px 10px",
                                                    borderRadius: 6,
                                                    border: "1px solid #444",
                                                    fontSize: 13,
                                                }}
                                            >
                                                <option value="USER">USER</option>
                                                <option value="ADMIN">ADMIN</option>
                                            </select>
                                        ) : (
                                            <span style={{
                                                padding: "4px 8px",
                                                borderRadius: 4,
                                                background: user.role === "ADMIN" ? "#dbeafe" : "#f3f4f6",
                                                color: user.role === "ADMIN" ? "#1e40af" : "#374151",
                                                fontSize: 12,
                                                fontWeight: 600,
                                            }}>
                                                {user.role}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: "12px" }}>
                                        {editingId === user.id ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    placeholder="사용자 이름"
                                                    required
                                                    style={{
                                                        width: "100%",
                                                        maxWidth: 300,
                                                        padding: "6px 10px",
                                                        borderRadius: 6,
                                                        border: "1px solid #444",
                                                        fontSize: 13,
                                                    }}
                                                />
                                                <input
                                                    type="password"
                                                    value={editPassword}
                                                    onChange={(e) => setEditPassword(e.target.value)}
                                                    placeholder="비밀번호 변경 (선택사항)"
                                                    style={{
                                                        width: "100%",
                                                        maxWidth: 300,
                                                        padding: "6px 10px",
                                                        borderRadius: 6,
                                                        border: "1px solid #444",
                                                        fontSize: 13,
                                                    }}
                                                />
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdate(user.id)}
                                                        disabled={submitting}
                                                        style={{
                                                            padding: "6px 12px",
                                                            borderRadius: 6,
                                                            border: "1px solid #444",
                                                            background: submitting ? "#999" : "#2563eb",
                                                            color: "#fff",
                                                            fontWeight: 600,
                                                            cursor: submitting ? "not-allowed" : "pointer",
                                                            fontSize: 13,
                                                        }}
                                                    >
                                                        저장
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleCancelEdit}
                                                        disabled={submitting}
                                                        style={{
                                                            padding: "6px 12px",
                                                            borderRadius: 6,
                                                            border: "1px solid #444",
                                                            background: "#fff",
                                                            color: "#111",
                                                            fontWeight: 600,
                                                            cursor: submitting ? "not-allowed" : "pointer",
                                                            fontSize: 13,
                                                        }}
                                                    >
                                                        취소
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleStartEdit(user)}
                                                    disabled={submitting}
                                                    style={{
                                                        padding: "6px 12px",
                                                        borderRadius: 6,
                                                        border: "1px solid #444",
                                                        background: "#2563eb",
                                                        color: "#fff",
                                                        fontWeight: 600,
                                                        cursor: submitting ? "not-allowed" : "pointer",
                                                        fontSize: 13,
                                                    }}
                                                >
                                                    수정
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(user.id)}
                                                    disabled={submitting}
                                                    style={{
                                                        padding: "6px 12px",
                                                        borderRadius: 6,
                                                        border: "1px solid #dc2626",
                                                        background: "#dc2626",
                                                        color: "#fff",
                                                        fontWeight: 600,
                                                        cursor: submitting ? "not-allowed" : "pointer",
                                                        fontSize: 13,
                                                    }}
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && (
                        <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
                            등록된 사용자가 없습니다.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
