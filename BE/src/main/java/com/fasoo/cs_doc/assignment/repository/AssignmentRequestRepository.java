package com.fasoo.cs_doc.assignment.repository;

import com.fasoo.cs_doc.assignment.domain.AssignmentRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssignmentRequestRepository extends JpaRepository<AssignmentRequest, Long> {
    /** 사용자별 미확인 요청 (모달 표시용) */
    List<AssignmentRequest> findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(Long userId);
    List<AssignmentRequest> findByUserIdOrderByCreatedAtDesc(Long userId);
    /** 해당 실습의 평가대상자 요청 목록 (실습채점조회 필터용) */
    List<AssignmentRequest> findByPostId(Long postId);
}
