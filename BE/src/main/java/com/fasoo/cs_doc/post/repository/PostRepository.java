package com.fasoo.cs_doc.post.repository;

import com.fasoo.cs_doc.post.domain.Post;
import com.fasoo.cs_doc.post.domain.PostKind;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
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

    /** 실습(과제) 목록 - 관리자 채점 조회용 */
    List<Post> findByDeletedFalseAndPostKindOrderByCreatedAtDesc(PostKind postKind);
}
