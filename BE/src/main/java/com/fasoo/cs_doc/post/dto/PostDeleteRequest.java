package com.fasoo.cs_doc.post.dto;

/**
 * 게시글 소프트 삭제 시 필수 사유.
 */
public record PostDeleteRequest(String deletionReason) {}
