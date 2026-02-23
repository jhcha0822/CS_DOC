package com.fasoo.cs_doc.post.domain;

/**
 * 게시글 종류: 일반 문서 vs 과제(실습).
 * 기존 글은 null 또는 DOC, 실습 과제는 ASSIGNMENT.
 */
public enum PostKind {
    DOC,
    ASSIGNMENT
}
