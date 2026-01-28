package com.fasoo.cs_doc.post.service;

import com.fasoo.cs_doc.global.exception.NotFoundException;
import com.fasoo.cs_doc.global.page.PageResponse;
import com.fasoo.cs_doc.post.domain.Post;
import com.fasoo.cs_doc.post.dto.*;
import com.fasoo.cs_doc.post.repository.PostRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final PostContentStorage storage;

    public PostService(PostRepository postRepository, PostContentStorage storage) {
        this.postRepository = postRepository;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public PageResponse<PostListItemResponse> list(Pageable pageable, String keyword) {
        Page<Post> page;

        if (keyword == null || keyword.isBlank()) {
            page = postRepository.findAll(pageable);
        } else {
            page = postRepository.findByTitleContainingIgnoreCase(keyword.trim(), pageable);
        }

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
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext(),
                page.hasPrevious()
        );
    }

    @Transactional
    public PostResponse create(PostCreateRequest req) {
        // 1) id 확보용 row 생성 (mdPath는 null)
        Post saved = postRepository.save(new Post(req.title(), null));

        // 2) 파일 저장 후 mdPath 세팅
        String mdPath = storage.saveNew(req.contentMd(), saved.getId());
        saved.changeContentMdPath(mdPath);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PostDetailResponse getDetail(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        String mdPath = post.getContentMdPath();
        if (mdPath == null) {
            throw new IllegalStateException("Post contentMdPath is null: " + id);
        }

        String md = storage.read(mdPath);

        return new PostDetailResponse(
                post.getId(),
                post.getTitle(),
                mdPath,
                md,
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }

    @Transactional
    public PostResponse update(Long id, PostUpdateRequest req) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        String mdPath = post.getContentMdPath();
        if (mdPath == null) {
            throw new IllegalStateException("Post contentMdPath is null: " + id);
        }

        post.changeTitle(req.title());
        storage.overwrite(mdPath, req.contentMd());

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
