package com.fasoo.cs_doc.assignment.dto;

/**
 * 사용자용 "평가 완료된 실습" 알림 한 건.
 */
public record GradedNotificationItem(Long id, Long postId, String postTitle) {}
