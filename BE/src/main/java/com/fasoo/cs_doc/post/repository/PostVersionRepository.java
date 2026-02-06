package com.fasoo.cs_doc.post.repository;

import com.fasoo.cs_doc.post.domain.PostVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostVersionRepository extends JpaRepository<PostVersion, Long> {
    /**
     * 특정 게시글의 모든 버전을 버전 번호 내림차순으로 조회
     */
    List<PostVersion> findByPostIdOrderByVersionNumberDesc(Long postId);

    /**
     * 특정 게시글의 최신 버전 조회
     */
    Optional<PostVersion> findFirstByPostIdOrderByVersionNumberDesc(Long postId);

    /**
     * 특정 게시글의 특정 버전 번호 조회
     */
    Optional<PostVersion> findByPostIdAndVersionNumber(Long postId, Integer versionNumber);

    /**
     * 특정 게시글의 다음 버전 번호 계산
     */
    default Integer getNextVersionNumber(Long postId) {
        Optional<PostVersion> latest = findFirstByPostIdOrderByVersionNumberDesc(postId);
        return latest.map(v -> v.getVersionNumber() + 1).orElse(1);
    }

    /**
     * 모든 버전을 생성일 내림차순으로 조회 (전체 변경 이력용)
     */
    List<PostVersion> findAllByOrderByCreatedAtDesc();
}
