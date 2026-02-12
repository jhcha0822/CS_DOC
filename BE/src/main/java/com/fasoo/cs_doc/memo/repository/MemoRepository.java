package com.fasoo.cs_doc.memo.repository;

import com.fasoo.cs_doc.memo.domain.Memo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MemoRepository extends JpaRepository<Memo, Long> {

    /** 제목+본문 검색 (대소문자 무시, 최신순) */
    @Query("SELECT m FROM Memo m WHERE LOWER(m.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(m.body) LIKE LOWER(CONCAT('%', :keyword, '%')) ORDER BY m.updatedAt DESC")
    Page<Memo> findByKeyword(@Param("keyword") String keyword, Pageable pageable);

    /** 키워드 없을 때 전체 목록 (Pageable로 페이징, 정렬은 service에서 Sort 지정) */
    Page<Memo> findAllBy(Pageable pageable);

    /** 키워드 검색 결과 개수 */
    @Query("SELECT COUNT(m) FROM Memo m WHERE LOWER(m.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(m.body) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    long countByKeyword(@Param("keyword") String keyword);
}
