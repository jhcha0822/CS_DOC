import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import SideNav from "../components/SideNav";
import Header from "../components/Header";
import NotificationModal from "../components/NotificationModal";
import { getCurrentUser } from "../lib/auth";
import { isAdmin } from "../lib/auth";
import {
    fetchMyUnreadAssignmentRequests,
    fetchUnreadGradingNotifications,
    fetchMyUnreadGradedNotifications,
    type AssignmentRequestItem,
    type GradingNotificationItem,
    type GradedNotificationItem,
} from "../lib/api";
import { SITE_NAME } from "../lib/site";

export default function AppLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        document.title =
            location.pathname === "/admin/content-stats"
                ? `게시글 통계 · ${SITE_NAME}`
                : SITE_NAME;
    }, [location.pathname]);
    const [unreadRequests, setUnreadRequests] = useState<AssignmentRequestItem[]>([]);
    const [unreadGrading, setUnreadGrading] = useState<GradingNotificationItem[]>([]);
    const [unreadGraded, setUnreadGraded] = useState<GradedNotificationItem[]>([]);
    const [notificationModalOpen, setNotificationModalOpen] = useState(false);

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) {
            navigate("/login", { replace: true });
            return;
        }
        // 페이지 이동 시마다 미확인 알림 조회 → 있으면 모달 표시
        const load = async () => {
            try {
                const [requests, graded] = await Promise.all([
                    fetchMyUnreadAssignmentRequests(),
                    fetchMyUnreadGradedNotifications(),
                ]);
                let grading: GradingNotificationItem[] = [];
                if (isAdmin()) {
                    grading = await fetchUnreadGradingNotifications();
                    setUnreadGrading(grading);
                } else {
                    setUnreadGrading([]);
                }
                setUnreadRequests(requests);
                setUnreadGraded(graded);
                const hasAny = requests.length > 0 || graded.length > 0 || grading.length > 0;
                if (hasAny) setNotificationModalOpen(true);
            } catch {
                /* no-op */
            }
        };
        load();
    }, [navigate, location.pathname]);

    const user = getCurrentUser();
    if (!user) {
        return null; // 리다이렉트 중
    }

    const hasUnread = unreadRequests.length > 0 || unreadGrading.length > 0 || unreadGraded.length > 0;

    return (
        <div
            className="app-layout"
            style={{
                width: "100vw",
                minHeight: "100vh",
                height: "100%",
                overflow: "hidden",
                boxSizing: "border-box",
                background: "#ffffff",
            }}
        >
            <Header />

            <aside
                style={{
                    position: "fixed",
                    left: 0,
                    top: 64,
                    width: 240,
                    height: "calc(100vh - 64px)",
                    borderRight: "1px solid #e5e7eb",
                    padding: "16px 8px",
                    background: "#ffffff",
                    color: "#111827",
                    overflowY: "auto",
                    boxSizing: "border-box",
                }}
            >
                <SideNav />
            </aside>

            <main
                style={{
                    marginLeft: 240,
                    marginTop: 64,
                    width: "calc(100vw - 240px)",
                    maxWidth: "calc(100vw - 240px)",
                    height: "calc(100vh - 64px)",
                    padding: 24,
                    background: "#ffffff",
                    color: "#111827",
                    overflow: "auto",
                    overflowX: "hidden",
                    boxSizing: "border-box",
                }}
            >
                <Outlet />
            </main>
            <NotificationModal
                open={notificationModalOpen && hasUnread}
                assignmentRequests={unreadRequests}
                gradingItems={unreadGrading}
                gradedItems={unreadGraded}
                isAdmin={isAdmin()}
                onClose={() => {
                    setNotificationModalOpen(false);
                    setUnreadRequests([]);
                    setUnreadGrading([]);
                    setUnreadGraded([]);
                }}
                onGoToAssignment={(postId) => navigate(`/posts/${postId}/assignment`)}
                onGoToGrading={(postId) => navigate(`/admin/assignment-grades?assignmentId=${postId}`)}
            />
        </div>
    );
}
