package com.fasoo.cs_doc.assignment.repository;

import com.fasoo.cs_doc.assignment.domain.AdminGradingNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AdminGradingNotificationRepository extends JpaRepository<AdminGradingNotification, Long> {
    List<AdminGradingNotification> findByAdminIdAndReadAtIsNullOrderByCreatedAtDesc(Long adminId);
    List<AdminGradingNotification> findByAdminIdOrderByCreatedAtDesc(Long adminId);
    List<AdminGradingNotification> findByPostId(Long postId);
    Optional<AdminGradingNotification> findByAdminIdAndPostId(Long adminId, Long postId);
}
