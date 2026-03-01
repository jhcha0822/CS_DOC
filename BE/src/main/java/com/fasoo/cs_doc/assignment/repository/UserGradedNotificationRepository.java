package com.fasoo.cs_doc.assignment.repository;

import com.fasoo.cs_doc.assignment.domain.UserGradedNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserGradedNotificationRepository extends JpaRepository<UserGradedNotification, Long> {
    List<UserGradedNotification> findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(Long userId);
    List<UserGradedNotification> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<UserGradedNotification> findByUserIdAndPostId(Long userId, Long postId);
}
