package com.fasoo.cs_doc.memo.repository;

import com.fasoo.cs_doc.memo.domain.Memo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface MemoRepository extends JpaRepository<Memo, Long>, JpaSpecificationExecutor<Memo> {

    /** 키워드 없을 때 전체 목록 (Pageable로 페이징, 정렬은 service에서 Sort 지정) */
    Page<Memo> findAllBy(Pageable pageable);

    /** 관리자 통계: 기간 내 등록된 메모 수 (createdAt ∈ [start, end) ) */
    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(LocalDateTime startInclusive, LocalDateTime endExclusive);

    @Query("SELECT m FROM Memo m WHERE m.createdAt >= :start AND m.createdAt < :end")
    Page<Memo> pageCreatedInPeriod(
            @Param("start") LocalDateTime startInclusive,
            @Param("end") LocalDateTime endExclusive,
            Pageable pageable
    );
}
