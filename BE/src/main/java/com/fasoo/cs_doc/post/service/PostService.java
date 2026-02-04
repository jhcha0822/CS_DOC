package com.fasoo.cs_doc.post.service;

import com.fasoo.cs_doc.category.domain.Category;
import com.fasoo.cs_doc.category.repository.CategoryRepository;
import com.fasoo.cs_doc.global.exception.NotFoundException;
import com.fasoo.cs_doc.global.page.PageResponse;
import com.fasoo.cs_doc.post.domain.Post;
import com.fasoo.cs_doc.post.domain.PostCategory;
import com.fasoo.cs_doc.post.dto.*;
import com.fasoo.cs_doc.post.repository.PostRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final PostContentStorage storage;
    private final CategoryRepository categoryRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public PostService(PostRepository postRepository, PostContentStorage storage, CategoryRepository categoryRepository) {
        this.postRepository = postRepository;
        this.storage = storage;
        this.categoryRepository = categoryRepository;
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
     * Category code를 PostCategory enum으로 변환
     */
    private PostCategory codeToPostCategory(String code) {
        if (code == null) return null;
        String upper = code.toUpperCase();
        if (upper.contains("SYSTEM")) return PostCategory.SYSTEM;
        if (upper.contains("INCIDENT")) return PostCategory.INCIDENT;
        if (upper.contains("TRAINING")) return PostCategory.TRAINING;
        return null;
    }

    /**
     * 카테고리 ID와 그 하위 카테고리들의 PostCategory 목록 반환
     * 상위 카테고리는 하위 카테고리들의 PostCategory만 포함
     * PostCategory로 변환할 수 없는 카테고리는 빈 리스트 반환 (게시글이 없음을 의미)
     */
    private List<PostCategory> getPostCategoriesByCategoryId(Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new NotFoundException("Category", categoryId));
        List<PostCategory> result = new ArrayList<>();
        List<Category> children = categoryRepository.findByParentIdOrderBySortOrderAsc(categoryId);
        for (Category child : children) {
            PostCategory childCat = codeToPostCategory(child.getCode());
            if (childCat != null && !result.contains(childCat)) {
                result.add(childCat);
            }
        }
        if (result.isEmpty()) {
            // 하위 카테고리가 없으면 자기 자신의 code를 PostCategory로 변환 시도
            PostCategory selfCat = codeToPostCategory(category.getCode());
            if (selfCat != null) {
                result.add(selfCat);
            }
            // PostCategory로 변환할 수 없으면 빈 리스트 반환 (게시글이 없음을 의미)
        }
        return result;
    }

    /**
     * ✅ 신규: 페이징 + keyword + searchIn + categories + categoryId 통합 목록
     * searchIn: title, content, author, all. 현재는 title/all만 제목 검색, content/author는 추후 확장.
     * categoryId가 있으면 해당 카테고리와 하위 카테고리들만 조회
     */
    @Transactional(readOnly = true)
    public PageResponse<PostListItemResponse> list(Pageable pageable, String keyword, String searchIn, List<String> categories, Long categoryId) {

        // 1) categoryId가 있으면 해당 카테고리와 하위 카테고리들의 PostCategory 사용
        List<PostCategory> targetCategories;
        if (categoryId != null) {
            targetCategories = getPostCategoriesByCategoryId(categoryId);
            // 빈 리스트면 게시글이 없는 카테고리이므로 빈 결과 반환
            if (targetCategories.isEmpty()) {
                return PageResponse.of(
                        List.of(),
                        pageable.getPageNumber(),
                        pageable.getPageSize(),
                        0L,
                        0,
                        false,
                        false
                );
            }
        } else if (categories != null && !categories.isEmpty()) {
            targetCategories = categories.stream()
                    .map(s -> PostCategory.valueOf(s.toUpperCase()))
                    .collect(Collectors.toList());
        } else {
            targetCategories = List.of(PostCategory.values());
        }

        // 2) 조회 (searchIn에 따라 추후 content/author 검색 확장 가능, 현재는 모두 제목 검색)
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
        return list(pageable, keyword, null, null, null);
    }

    @Transactional
    public PostResponse create(PostCreateRequest req) {
        Post post = new Post(req.title(), null);
        post.changeCategory(req.category() != null ? req.category() : PostCategory.TRAINING);
        Post saved = postRepository.save(post);

        String mdPath = storage.saveNew(req.contentMd(), saved.getId());
        saved.changeContentMdPath(mdPath);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PostDetailResponse getDetail(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        String mdPath = post.getContentMdPath();
        String md = (mdPath == null || mdPath.isBlank())
                ? null
                : storage.read(mdPath);

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
        String md = (mdPath == null || mdPath.isBlank())
                ? ""
                : storage.read(mdPath);
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
    public PostResponse createByUpload(MultipartFile file, String title, PostCategory category) {
        String md = readMarkdownFromMultipart(file);

        String finalTitle = (title == null || title.isBlank())
                ? extractTitleOrDefault(md)
                : title;

        Post post = new Post(finalTitle, null);
        post.changeCategory(category != null ? category : PostCategory.TRAINING);
        Post saved = postRepository.save(post);
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
            mdPath = storage.saveNew(markdown, post.getId());
            post.changeContentMdPath(mdPath);
        } else {
            storage.overwrite(mdPath, markdown);
        }

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
                && req.category() == null
                && (req.markdown() == null)) {
            throw new IllegalArgumentException("Nothing to update");
        }

        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        // 1) title 갱신
        if (req.title() != null && !req.title().isBlank()) {
            post.changeTitle(req.title());
        }

        // 1-2) category 갱신
        if (req.category() != null) {
            post.changeCategory(req.category());
        }

        // 2) markdown 갱신(파일 없으면 새로 생성)
        if (req.markdown() != null) {
            String mdPath = post.getContentMdPath();
            if (mdPath == null || mdPath.isBlank()) {
                mdPath = storage.saveNew(req.markdown(), post.getId());
                post.changeContentMdPath(mdPath);
                entityManager.flush();
            } else {
                storage.overwrite(mdPath, req.markdown());
            }
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
