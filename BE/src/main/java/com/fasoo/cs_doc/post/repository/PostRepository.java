package com.fasoo.cs_doc.post.repository;

import com.fasoo.cs_doc.post.domain.Post;
import com.fasoo.cs_doc.post.domain.PostKind;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {

    /** 목록 병합용: 페이지 상한 없이 정렬만 적용 (내부 페이징은 서비스에서 처리) */
    List<Post> findByDeletedFalseAndCategoryIdIn(List<Long> categoryIds, Sort sort);

    List<Post> findByDeletedFalseAndCategoryIdInAndTitleContainingIgnoreCase(List<Long> categoryIds, String keyword, Sort sort);

    List<Post> findByIsNoticeFalseAndDeletedFalse(Sort sort);

    List<Post> findByIsNoticeFalseAndDeletedFalseAndTitleContainingIgnoreCase(String keyword, Sort sort);

    List<Post> findByIsNoticeFalseAndDeletedFalseAndCategoryIdIn(List<Long> categoryIds, Sort sort);

    List<Post> findByIsNoticeFalseAndDeletedFalseAndCategoryIdInAndTitleContainingIgnoreCase(List<Long> categoryIds, String keyword, Sort sort);

    List<Post> findByIsNoticeFalseAndDeletedFalseAndCategoryIdInAndPostKind(List<Long> categoryIds, PostKind postKind, Sort sort);

    List<Post> findByIsNoticeFalseAndDeletedFalseAndCategoryIdInAndPostKindAndTitleContainingIgnoreCase(List<Long> categoryIds, PostKind postKind, String keyword, Sort sort);

    List<Post> findByIsNoticeFalseAndDeletedFalseAndCategory(com.fasoo.cs_doc.post.domain.PostCategory category, Sort sort);

    List<Post> findByIsNoticeFalseAndDeletedFalseAndCategoryAndTitleContainingIgnoreCase(com.fasoo.cs_doc.post.domain.PostCategory category, String keyword, Sort sort);

    Page<Post> findByTitleContainingIgnoreCase(String keyword, Pageable pageable);
    
    // categoryId 기반 쿼리
    Page<Post> findByCategoryIdIn(List<Long> categoryIds, Pageable pageable);
    Page<Post> findByCategoryIdInAndTitleContainingIgnoreCase(List<Long> categoryIds, String keyword, Pageable pageable);
    List<Post> findByCategoryIdInOrderByCreatedAtDesc(List<Long> categoryIds);

    /** 해당 카테고리를 참조하는 게시글 수 (삭제 여부 무관) */
    long countByCategoryId(Long categoryId);
    
    // 삭제되지 않은 게시글 조회 (공지사항 포함, 카테고리 필터)
    Page<Post> findByDeletedFalseAndCategoryIdIn(List<Long> categoryIds, Pageable pageable);
    Page<Post> findByDeletedFalseAndCategoryIdInAndTitleContainingIgnoreCase(List<Long> categoryIds, String keyword, Pageable pageable);
    
    // 공지사항 조회 (isNotice = true, 최신순)
    List<Post> findByIsNoticeTrueOrderByCreatedAtDesc();
    
    // 공지사항 제외 조회 (삭제되지 않은 것만)
    Page<Post> findByIsNoticeFalseAndDeletedFalse(Pageable pageable);
    Page<Post> findByIsNoticeFalseAndDeletedFalseAndTitleContainingIgnoreCase(String keyword, Pageable pageable);
    Page<Post> findByIsNoticeFalseAndDeletedFalseAndCategoryIdIn(List<Long> categoryIds, Pageable pageable);
    Page<Post> findByIsNoticeFalseAndDeletedFalseAndCategoryIdInAndTitleContainingIgnoreCase(List<Long> categoryIds, String keyword, Pageable pageable);
    Page<Post> findByIsNoticeFalseAndDeletedFalseAndCategoryIdInAndPostKind(List<Long> categoryIds, PostKind postKind, Pageable pageable);
    Page<Post> findByIsNoticeFalseAndDeletedFalseAndCategoryIdInAndPostKindAndTitleContainingIgnoreCase(List<Long> categoryIds, PostKind postKind, String keyword, Pageable pageable);
    
    // category(enum) 기반 조회 (기존 데이터 호환성, 삭제되지 않은 것만)
    Page<Post> findByIsNoticeFalseAndDeletedFalseAndCategory(com.fasoo.cs_doc.post.domain.PostCategory category, Pageable pageable);
    Page<Post> findByIsNoticeFalseAndDeletedFalseAndCategoryAndTitleContainingIgnoreCase(com.fasoo.cs_doc.post.domain.PostCategory category, String keyword, Pageable pageable);

    // 공지사항 조회 (삭제되지 않은 것만)
    List<Post> findByIsNoticeTrueAndDeletedFalseOrderByCreatedAtDesc();

    long countByIsNoticeTrueAndDeletedFalse();
    
    // 삭제된 게시글 조회 (버전 이력 페이지용)
    Page<Post> findByDeletedTrue(Pageable pageable);
    Page<Post> findByDeletedTrueAndTitleContainingIgnoreCase(String keyword, Pageable pageable);
    List<Post> findByDeletedTrueAndId(Long id); // ID로 검색
    List<Post> findByDeletedTrueOrderByUpdatedAtDesc(); // 삭제 이력용
    
    // 삭제되지 않은 게시글 조회 (하위 호환성)
    @Deprecated
    Page<Post> findByIsNoticeFalse(Pageable pageable);
    @Deprecated
    Page<Post> findByIsNoticeFalseAndTitleContainingIgnoreCase(String keyword, Pageable pageable);
    @Deprecated
    Page<Post> findByIsNoticeFalseAndCategoryIdIn(List<Long> categoryIds, Pageable pageable);
    @Deprecated
    Page<Post> findByIsNoticeFalseAndCategoryIdInAndTitleContainingIgnoreCase(List<Long> categoryIds, String keyword, Pageable pageable);
    
    // 카테고리 ID와 그 하위 카테고리들을 포함하는 쿼리 (카테고리 계층 구조 지원)
    // 재귀적으로 하위 카테고리를 찾기 위해 Java 코드에서 처리하므로 여기서는 단순 쿼리만 제공

    /** 관리자 통계: 카테고리별 비삭제 게시글 수 */
    long countByDeletedFalseAndCategoryIdIn(Collection<Long> categoryIds);

    long countByDeletedFalseAndCategoryIdInAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            Collection<Long> categoryIds,
            LocalDateTime createdAtAfterInclusive,
            LocalDateTime createdAtBeforeExclusive
    );

    long countByDeletedFalseAndCategoryIdIsNull();

    long countByDeletedFalseAndCategoryIdIsNullAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            LocalDateTime createdAtAfterInclusive,
            LocalDateTime createdAtBeforeExclusive
    );

    long countByDeletedFalse();

    long countByDeletedFalseAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            LocalDateTime createdAtAfterInclusive,
            LocalDateTime createdAtBeforeExclusive
    );

    Page<Post> findByDeletedFalseAndCategoryIdInAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            Collection<Long> categoryIds,
            LocalDateTime createdAtAfterInclusive,
            LocalDateTime createdAtBeforeExclusive,
            Pageable pageable
    );

    /** 관리자 통계: 삭제 여부 무관, 카테고리·등록일 범위 */
    Page<Post> findByCategoryIdInAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            Collection<Long> categoryIds,
            LocalDateTime createdAtAfterInclusive,
            LocalDateTime createdAtBeforeExclusive,
            Pageable pageable
    );

    Page<Post> findByDeletedFalseAndCategoryIdIsNull(Pageable pageable);

    /** 관리자 통계: 삭제 여부 무관, category_id IS NULL */
    Page<Post> findByCategoryIdIsNull(Pageable pageable);

    Page<Post> findByDeletedFalseAndCategoryIdIsNullAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            LocalDateTime createdAtAfterInclusive,
            LocalDateTime createdAtBeforeExclusive,
            Pageable pageable
    );

    Page<Post> findByCategoryIdIsNullAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            LocalDateTime createdAtAfterInclusive,
            LocalDateTime createdAtBeforeExclusive,
            Pageable pageable
    );

    /** 실습(과제) 목록 - 관리자 채점 조회용 */
    List<Post> findByDeletedFalseAndPostKindOrderByCreatedAtDesc(PostKind postKind);

    /** 관리자 통계: 기간 내 신규(생성일 기준, 삭제 여부 무관) */
    long countByCategoryIdInAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            Collection<Long> categoryIds,
            LocalDateTime createdAtAfterInclusive,
            LocalDateTime createdAtBeforeExclusive
    );

    long countByCategoryIdIsNullAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            LocalDateTime createdAtAfterInclusive,
            LocalDateTime createdAtBeforeExclusive
    );

    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            LocalDateTime createdAtAfterInclusive,
            LocalDateTime createdAtBeforeExclusive
    );

    /** 관리자 통계: 기간 내 소프트 삭제 건수(updatedAt 기준, 삭제 처리 시각 근사) */
    long countByDeletedTrueAndCategoryIdInAndUpdatedAtGreaterThanEqualAndUpdatedAtLessThan(
            Collection<Long> categoryIds,
            LocalDateTime updatedAtAfterInclusive,
            LocalDateTime updatedAtBeforeExclusive
    );

    long countByDeletedTrueAndCategoryIdIsNullAndUpdatedAtGreaterThanEqualAndUpdatedAtLessThan(
            LocalDateTime updatedAtAfterInclusive,
            LocalDateTime updatedAtBeforeExclusive
    );

    long countByDeletedTrueAndUpdatedAtGreaterThanEqualAndUpdatedAtLessThan(
            LocalDateTime updatedAtAfterInclusive,
            LocalDateTime updatedAtBeforeExclusive
    );

    /** 조회수만 증가 (updatedAt 변경 없음. 상세 조회 시 수정 시각이 바뀌는 현상 방지) */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Post p SET p.viewCount = COALESCE(p.viewCount, 0) + 1 WHERE p.id = :id")
    int incrementViewCountById(@Param("id") Long id);
}
