package com.fasoo.cs_doc.post.service;

import com.fasoo.cs_doc.global.exception.NotFoundException;
import com.fasoo.cs_doc.global.page.PageResponse;
import com.fasoo.cs_doc.post.domain.Post;
import com.fasoo.cs_doc.post.domain.PostCategory;
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

    private PostListItemResponse toListItem(Post p) {
        // ✅ category null 방어(네가 적용한 방향 유지)
        PostCategory category = (p.getCategory() == null) ? PostCategory.TRAINING : p.getCategory();

        return new PostListItemResponse(
                p.getId(),
                p.getTitle(),
                category,
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
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

    /**
     * ✅ 신규: 페이징 + keyword + categories 통합 목록
     * Controller에서 categories는 List<String>으로 받으므로 여기서 enum 변환까지 처리한다.
     */
    @Transactional(readOnly = true)
    public PageResponse<PostListItemResponse> list(Pageable pageable, String keyword, List<String> categories) {

        // 1) categories -> List<PostCategory>
        List<PostCategory> targetCategories =
                (categories == null || categories.isEmpty())
                        ? List.of(PostCategory.values())
                        : categories.stream()
                        .map(s -> PostCategory.valueOf(s.toUpperCase()))
                        .toList();

        // 2) 조회
        Page<Post> page;
        String kw = (keyword == null) ? null : keyword.trim();

        if (kw == null || kw.isBlank()) {
            page = postRepository.findByCategoryIn(targetCategories, pageable);
        } else {
            page = postRepository.findByCategoryInAndTitleContainingIgnoreCase(targetCategories, kw, pageable);
        }

        // 3) PageResponse 매핑
        List<PostListItemResponse> items = page.getContent().stream()
                .map(this::toListItem)
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

    /**
     * (기존 호환) categories 없이 쓰던 list(pageable, keyword)
     */
    @Transactional(readOnly = true)
    public PageResponse<PostListItemResponse> list(Pageable pageable, String keyword) {
        return list(pageable, keyword, null);
    }

    @Transactional
    public PostResponse create(PostCreateRequest req) {
        // 🚨 여기서 new Post(req.title(), PostCategory.TRAINING) 하면 타입 오류남.
        // Post 생성자 2번째는 String(contentMdPath)로 쓰는 구조이기 때문.
        Post saved = postRepository.save(new Post(req.title(), null)); // ✅ 원복/정답

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
                post.getCategory(),
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

    @Transactional
    public PostResponse createByUpload(MultipartFile file, String title) {
        String md = readMarkdownFromMultipart(file);

        String finalTitle = (title == null || title.isBlank())
                ? extractTitleOrDefault(md)
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

    /**
     * (기존) FE 임시용: category 목록만 받아서 전체 조회(페이징 없음)
     * ✅ Controller에서 이걸 쓰는 레거시 getPosts를 지웠으면, 이 메서드는 남겨도/지워도 무방.
     * (다만 안 쓰면 정리 차원에서 삭제 추천)
     */
    @Transactional(readOnly = true)
    public List<PostListItemResponse> list(List<PostCategory> categories) {
        return postRepository.findByCategoryInOrderByCreatedAtDesc(categories)
                .stream()
                .map(this::toListItem)
                .toList();
    }
}
