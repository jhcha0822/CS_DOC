package com.fasoo.cs_doc.assignment.dto;

/**
 * 관리자용 "평가 필요" 알림 한 건 (종/모달 표시용).
 */
public record GradingNotificationItem(Long postId, String postTitle) {}
