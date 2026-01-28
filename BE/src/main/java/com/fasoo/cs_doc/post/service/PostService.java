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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
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
                .map(p -> {
                    return new PostListItemResponse(
                            p.getId(),
                            p.getTitle(),
                            p.getCreatedAt(),
                            p.getUpdatedAt()
                    );
                })
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
        Post saved = postRepository.save(new Post(req.title(), null));

        // 이제 mdPath는 항상 posts/{id}.md
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
                md,
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }

    @Transactional(readOnly = true)
    public PostContentResponse getContent(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        String mdPath = post.getContentMdPath();
        if (mdPath == null) {
            throw new IllegalStateException("Post contentMdPath is null: " + id);
        }

        String md = storage.read(mdPath);
        return new PostContentResponse(md);
    }

    @Transactional
    public PostResponse update(Long id, PostUpdateRequest req) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        String mdPath = post.getContentMdPath();
        if (mdPath == null) throw new IllegalStateException("Post contentMdPath is null: " + id);

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

    @Transactional
    public PostResponse createByUpload(MultipartFile file, String title) {
        String md = readMarkdownFromMultipart(file);

        String finalTitle = (title == null || title.isBlank())
                ? extractTitleOrDefault(md)   // 선택
                : title;

        Post saved = postRepository.save(new Post(finalTitle, null));
        String mdPath = storage.saveNew(md, saved.getId());
        saved.changeContentMdPath(mdPath);

        return toResponse(saved);
    }

    private String readMarkdownFromMultipart(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Upload file is required");
        }

        // 크기 제한 (예: 2MB)
        long maxSize = 2L * 1024 * 1024;
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("Markdown file too large");
        }

        try {
            // UTF-8 기준으로 통일
            return new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read markdown upload", e);
        }
    }

    // 선택: md 첫 줄 "# 제목" 추출
    private String extractTitleOrDefault(String md) {
        if (md == null) return "Untitled";
        String s = md.strip();
        if (s.startsWith("#")) {
            String line = s.split("\n", 2)[0];
            return line.replaceFirst("^#+\\s*", "").trim();
        }
        return "Untitled";
    }

    @Transactional
    public PostResponse updateByUpload(Long id, MultipartFile file, String title) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        // 1. 업로드 파일 → markdown 텍스트
        String markdown = readMarkdownFromMultipart(file);

        // 2. title이 넘어오면 갱신 (선택)
        if (title != null && !title.isBlank()) {
            post.changeTitle(title);
        }

        // 3. 기존 contentMdPath 확인
        String mdPath = post.getContentMdPath();
        if (mdPath == null || mdPath.isBlank()) {
            throw new IllegalStateException("contentMdPath is null for post: " + id);
        }

        // 4. 기존 md 파일 덮어쓰기
        storage.overwrite(mdPath, markdown);

        return toResponse(post);
    }

    @Transactional
    public void delete(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        String mdPath = post.getContentMdPath();

        // 1) DB 삭제 요청
        postRepository.delete(post);

        // 2) 파일 삭제 (없으면 통과)
        storage.deleteIfExists(mdPath);
    }

    @Transactional
    public PostResponse patch(Long id, PostPatchRequest req) {
        if ((req.title() == null || req.title().isBlank())
                && (req.markdown() == null)) {
            throw new IllegalArgumentException("Nothing to update");
        }

        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        // 1) title 갱신
        if (req.title() != null && !req.title().isBlank()) {
            post.changeTitle(req.title());
        }

        // 2) markdown 갱신(파일 overwrite)
        if (req.markdown() != null) {
            String mdPath = post.getContentMdPath();
            if (mdPath == null || mdPath.isBlank()) {
                throw new IllegalStateException("contentMdPath is null for post: " + id);
            }
            storage.overwrite(mdPath, req.markdown());
        }

        return toResponse(post);
    }
}
