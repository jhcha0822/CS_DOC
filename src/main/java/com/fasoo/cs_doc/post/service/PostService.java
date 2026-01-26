package com.fasoo.cs_doc.post.service;

import com.fasoo.cs_doc.global.exception.NotFoundException;
import com.fasoo.cs_doc.global.page.PageResponse;
import com.fasoo.cs_doc.post.domain.Post;
import com.fasoo.cs_doc.post.dto.*;
import com.fasoo.cs_doc.post.repository.PostRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;

import java.util.List;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final PostContentStorage storage;

    public PostService(PostRepository postRepository, PostContentStorage storage) {
        this.postRepository = postRepository;
        this.storage = storage;
    }

    // ✅ 추가: 목록 조회 (pagination)
    @Transactional(readOnly = true)
    public PageResponse list(Pageable pageable) {
        Page<Post> page = postRepository.findAll(pageable);

        List<PostListItemResponse> items = page.getContent().stream()
                .map(p -> new PostListItemResponse(
                        p.getId(),
                        p.getTitle(),
                        p.getContentMdPath(),
                        p.getCreatedAt(),
                        p.getUpdatedAt()
                ))
                .toList();

        return PageResponse.of(
                items,
                page.getNumber(),          // 현재 페이지 (0-based)
                page.getSize(),            // 페이지 사이즈
                page.getTotalElements(),   // 전체 개수
                page.getTotalPages(),      // 전체 페이지 수
                page.hasNext(),            // 다음 페이지 존재 여부
                page.hasPrevious()         // 이전 페이지 존재 여부
        );
    }

    @Transactional
    public PostResponse create(PostCreateRequest req) {
        // 1) 먼저 엔티티 생성(임시 mdPath로 넣었다가)
        Post post = new Post(req.title(), "TEMP");
        Post saved = postRepository.save(post);

        // 2) 파일 저장 후 mdPath 확정
        String mdPath = storage.saveNew(req.contentMd(), saved.getId());
        saved.changeContentMdPath(mdPath);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PostDetailResponse getDetail(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        String md = storage.read(post.getContentMdPath());
        return new PostDetailResponse(
                post.getId(),
                post.getTitle(),
                post.getContentMdPath(),
                md,
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }

    @Transactional
    public PostResponse update(Long id, PostUpdateRequest req) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        post.changeTitle(req.title());
        storage.overwrite(post.getContentMdPath(), req.contentMd());

        return toResponse(post);
    }

    private PostResponse toResponse(Post post) {
        return new PostResponse(
                post.getId(),
                post.getTitle(),
                post.getContentMdPath(),
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }
}
