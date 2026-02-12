export type UserInfo = {
    id: number;
    username: string;
    name: string;
    role: "ADMIN" | "USER";
};

const USER_STORAGE_KEY = "cs_doc_user";

export function getCurrentUser(): UserInfo | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) return null;
    try {
        return JSON.parse(stored) as UserInfo;
    } catch {
        return null;
    }
}

export function setCurrentUser(user: UserInfo | null): void {
    if (typeof window === "undefined") return;
    if (user === null) {
        localStorage.removeItem(USER_STORAGE_KEY);
    } else {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
}

export function isAdmin(): boolean {
    const user = getCurrentUser();
    return user?.role === "ADMIN";
}

export function isUser(): boolean {
    const user = getCurrentUser();
    return user !== null;
}

export function logout(): void {
    setCurrentUser(null);
    window.location.href = "/login";
}
