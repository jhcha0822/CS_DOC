package com.fasoo.cs_doc.assignment.dto;

/** 답안 저장 요청. taskId 있으면 세부 실습별, 없으면 통합 답변 */
public record TaskContentRequest(Long taskId, String markdown) {
    public String markdown() {
        return markdown != null ? markdown : "";
    }
}
