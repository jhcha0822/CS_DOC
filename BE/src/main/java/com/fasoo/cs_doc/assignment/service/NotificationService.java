package com.fasoo.cs_doc.assignment.service;

import com.fasoo.cs_doc.assignment.domain.AdminGradingNotification;
import com.fasoo.cs_doc.assignment.domain.UserGradedNotification;
import com.fasoo.cs_doc.assignment.dto.GradedNotificationItem;
import com.fasoo.cs_doc.assignment.dto.GradingNotificationItem;
import com.fasoo.cs_doc.assignment.repository.AdminGradingNotificationRepository;
import com.fasoo.cs_doc.assignment.repository.AssignmentSubmissionRepository;
import com.fasoo.cs_doc.assignment.repository.UserGradedNotificationRepository;
import com.fasoo.cs_doc.global.exception.NotFoundException;
import com.fasoo.cs_doc.post.domain.Post;
import com.fasoo.cs_doc.post.repository.PostRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class NotificationService {

    private final AdminGradingNotificationRepository adminGradingNotificationRepository;
    private final UserGradedNotificationRepository userGradedNotificationRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final PostRepository postRepository;

    public NotificationService(AdminGradingNotificationRepository adminGradingNotificationRepository,
                               UserGradedNotificationRepository userGradedNotificationRepository,
                               AssignmentSubmissionRepository submissionRepository,
                               PostRepository postRepository) {
        this.adminGradingNotificationRepository = adminGradingNotificationRepository;
        this.userGradedNotificationRepository = userGradedNotificationRepository;
        this.submissionRepository = submissionRepository;
        this.postRepository = postRepository;
    }

    /** 관리자: 미확인 "평가 필요" 알림 목록 (모달용) */
    @Transactional(readOnly = true)
    public List<GradingNotificationItem> findUnreadGradingByAdminId(Long adminId) {
        if (adminId == null) return List.of();
        List<AdminGradingNotification> list = adminGradingNotificationRepository.findByAdminIdAndReadAtIsNullOrderByCreatedAtDesc(adminId);
        return toGradingItems(list);
    }

    /** 관리자: 평가할 목록 (종 버튼용, 미확인 포함 전체) */
    @Transactional(readOnly = true)
    public List<GradingNotificationItem> findGradingTodoByAdminId(Long adminId) {
        if (adminId == null) return List.of();
        List<AdminGradingNotification> list = adminGradingNotificationRepository.findByAdminIdOrderByCreatedAtDesc(adminId);
        return toGradingItems(list);
    }

    /** 관리자: 모든 "평가 필요" 알림 확인 처리 */
    @Transactional
    public void markAllGradingReadByAdminId(Long adminId) {
        if (adminId == null) return;
        List<AdminGradingNotification> list = adminGradingNotificationRepository.findByAdminIdAndReadAtIsNullOrderByCreatedAtDesc(adminId);
        for (AdminGradingNotification n : list) {
            n.markAsRead();
            adminGradingNotificationRepository.save(n);
        }
    }

    /** 사용자: 미확인 "평가 완료된 실습" 알림 목록 */
    @Transactional(readOnly = true)
    public List<GradedNotificationItem> findUnreadGradedByUserId(Long userId) {
        if (userId == null) return List.of();
        List<UserGradedNotification> list = userGradedNotificationRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId);
        List<GradedNotificationItem> result = new ArrayList<>();
        for (UserGradedNotification n : list) {
            String title = postRepository.findById(n.getPostId()).map(Post::getTitle).orElse("");
            result.add(new GradedNotificationItem(n.getId(), n.getPostId(), title != null ? title : ""));
        }
        return result;
    }

    /** 사용자: "평가 완료" 알림 확인 처리 */
    @Transactional
    public void markGradedNotificationRead(Long notificationId, Long userId) {
        UserGradedNotification n = userGradedNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotFoundException("Notification not found: " + notificationId));
        if (!n.getUserId().equals(userId)) {
            throw new IllegalArgumentException("본인의 알림만 확인할 수 있습니다.");
        }
        n.markAsRead();
        userGradedNotificationRepository.save(n);
    }

    private List<GradingNotificationItem> toGradingItems(List<AdminGradingNotification> list) {
        List<GradingNotificationItem> result = new ArrayList<>();
        for (AdminGradingNotification n : list) {
            String title = postRepository.findById(n.getPostId()).map(Post::getTitle).orElse("");
            result.add(new GradingNotificationItem(n.getPostId(), title != null ? title : ""));
        }
        return result;
    }
}
