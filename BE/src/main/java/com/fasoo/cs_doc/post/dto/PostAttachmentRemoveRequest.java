package com.fasoo.cs_doc.post.dto;

/**
 * 게시글에서 첨부 링크만 제거할 때 사용 (파일은 삭제하지 않음 — 이전 버전·직접 URL 접근 호환).
 */
public record PostAttachmentRemoveRequest(String url) {}
