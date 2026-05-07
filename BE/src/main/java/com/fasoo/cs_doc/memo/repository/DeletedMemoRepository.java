package com.fasoo.cs_doc.memo.repository;

import com.fasoo.cs_doc.memo.domain.DeletedMemo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface DeletedMemoRepository extends JpaRepository<DeletedMemo, Long> {

    long countByDeletedAtGreaterThanEqualAndDeletedAtLessThan(LocalDateTime startInclusive, LocalDateTime endExclusive);

    @Query("SELECT d FROM DeletedMemo d WHERE d.deletedAt >= :start AND d.deletedAt < :end")
    Page<DeletedMemo> pageDeletedInPeriod(
            @Param("start") LocalDateTime startInclusive,
            @Param("end") LocalDateTime endExclusive,
            Pageable pageable
    );
}
