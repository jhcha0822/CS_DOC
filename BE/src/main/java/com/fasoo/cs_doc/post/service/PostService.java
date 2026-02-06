package com.fasoo.cs_doc.post.service;

import com.fasoo.cs_doc.category.domain.Category;
import com.fasoo.cs_doc.category.repository.CategoryRepository;
import com.fasoo.cs_doc.global.exception.NotFoundException;
import com.fasoo.cs_doc.global.page.PageResponse;
import com.fasoo.cs_doc.post.domain.Post;
import com.fasoo.cs_doc.post.domain.PostCategory;
import com.fasoo.cs_doc.post.domain.PostVersion;
import com.fasoo.cs_doc.post.dto.*;
import com.fasoo.cs_doc.post.repository.PostRepository;
import com.fasoo.cs_doc.post.repository.PostVersionRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class PostService {
    
    private static final Logger log = LoggerFactory.getLogger(PostService.class);

    private final PostRepository postRepository;
    private final PostVersionRepository postVersionRepository;
    private final PostContentStorage storage;
    private final CategoryRepository categoryRepository;
    private final MarkdownImageProcessor imageProcessor;
    private final AttachmentStorage attachmentStorage;

    @PersistenceContext
    private EntityManager entityManager;

    public PostService(PostRepository postRepository, PostVersionRepository postVersionRepository, PostContentStorage storage, CategoryRepository categoryRepository, MarkdownImageProcessor imageProcessor, AttachmentStorage attachmentStorage) {
        this.postRepository = postRepository;
        this.postVersionRepository = postVersionRepository;
        this.storage = storage;
        this.categoryRepository = categoryRepository;
        this.imageProcessor = imageProcessor;
        this.attachmentStorage = attachmentStorage;
    }

    /**
     * 카테고리 ID와 그 하위 카테고리들의 ID 목록 반환 (카테고리 계층 구조 지원)
     */
    private List<Long> getCategoryIdsIncludingChildren(Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new NotFoundException("Category", categoryId));
        
        List<Long> result = new ArrayList<>();
        result.add(categoryId); // 자기 자신 포함
        
        // 직접 하위 카테고리들 추가
        List<Category> children = categoryRepository.findByParentIdOrderBySortOrderAsc(categoryId);
        for (Category child : children) {
            result.add(child.getId());
            // 재귀적으로 하위 카테고리의 하위 카테고리들도 추가
            result.addAll(getCategoryIdsIncludingChildren(child.getId()));
        }
        
        return result;
    }

    /**
     * Category code를 PostCategory enum으로 매핑 (기존 데이터 호환성)
     */
    private PostCategory categoryCodeToPostCategory(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        String upper = code.toUpperCase();
        if (upper.contains("SYSTEM")) {
            return PostCategory.SYSTEM;
        }
        if (upper.contains("INCIDENT")) {
            return PostCategory.INCIDENT;
        }
        if (upper.contains("TRAINING")) {
            return PostCategory.TRAINING;
        }
        return null;
    }

    private PostListItemResponse toListItem(Post p) {
        // 기존 데이터 호환성을 위해 category가 있으면 사용, 없으면 null
        PostCategory category = p.getCategory(); // nullable
        
        return new PostListItemResponse(
                p.getId(),
                p.getTitle(),
                category,
                p.getCategoryId(),
                p.getIsNotice(),
                p.getViewCount(),
                p.getAttachments(),
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
     * 페이징 + keyword + searchIn + categoryId 통합 목록
     * categoryId가 있으면 해당 카테고리와 하위 카테고리들만 조회
     * 공지사항은 1페이지에만 상단에 표시되며, 목록 갯수에 포함됨
     * 공지사항이 페이지 크기를 점유하므로, 일반 글은 (페이지 크기 - 공지사항 개수)만큼만 조회됨
     */
    @Transactional(readOnly = true)
    public PageResponse<PostListItemResponse> list(Pageable pageable, String keyword, String searchIn, List<String> categories, Long categoryId) {
        String kw = (keyword == null) ? null : keyword.trim();
        boolean isFirstPage = pageable.getPageNumber() == 0;
        
        // 공지사항 조회 (1페이지에만, categoryId가 null일 때만 - 특정 카테고리 선택 시에는 공지사항 제외, 삭제되지 않은 것만)
        List<PostListItemResponse> noticeItems = List.of();
        int noticeCount = 0;
        if (isFirstPage && categoryId == null) {
            List<Post> notices = postRepository.findByIsNoticeTrueAndDeletedFalseOrderByCreatedAtDesc();
            noticeItems = notices.stream()
                    .map(this::toListItem)
                    .toList();
            noticeCount = noticeItems.size();
        }
        
        // 1페이지인 경우 공지사항이 페이지 크기를 점유하므로 일반 글은 (페이지 크기 - 공지사항 개수)만큼만 조회
        Pageable adjustedPageable = pageable;
        if (isFirstPage && noticeCount > 0) {
            int adjustedSize = Math.max(1, pageable.getPageSize() - noticeCount);
            adjustedPageable = org.springframework.data.domain.PageRequest.of(
                    pageable.getPageNumber(),
                    adjustedSize,
                    pageable.getSort()
            );
        }
        
        Page<Post> page;
        List<Post> legacyPosts = new ArrayList<>(); // category_id가 null인 기존 게시글들
        
        if (categoryId != null) {
            // categoryId가 있으면 해당 카테고리와 하위 카테고리들의 ID 목록 조회
            Category selectedCategory = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new NotFoundException("Category", categoryId));
            List<Long> targetCategoryIds = getCategoryIdsIncludingChildren(categoryId);
            
            // 선택된 카테고리의 code를 PostCategory enum으로 매핑 (기존 데이터 호환성)
            PostCategory legacyCategory = categoryCodeToPostCategory(selectedCategory.getCode());
            
            // categoryId 기반으로 조회 (공지사항 제외, 카테고리별 조회 시에는 공지사항을 표시하지 않음, 삭제되지 않은 것만)
            // 기존 데이터 호환성을 위해 더 많은 데이터를 조회 (페이징은 나중에 처리)
            Pageable largePageable = org.springframework.data.domain.PageRequest.of(0, 10000, pageable.getSort());
            if (kw == null || kw.isBlank()) {
                page = postRepository.findByIsNoticeFalseAndDeletedFalseAndCategoryIdIn(targetCategoryIds, largePageable);
                
                // 기존 데이터 호환성: category_id가 null이지만 category(enum)이 일치하는 게시글도 조회
                if (legacyCategory != null) {
                    Page<Post> legacyPage = postRepository.findByIsNoticeFalseAndDeletedFalseAndCategory(legacyCategory, largePageable);
                    legacyPosts = legacyPage.getContent().stream()
                            .filter(p -> p.getCategoryId() == null && !p.getDeleted()) // category_id가 null이고 삭제되지 않은 것만
                            .toList();
                }
            } else {
                page = postRepository.findByIsNoticeFalseAndDeletedFalseAndCategoryIdInAndTitleContainingIgnoreCase(targetCategoryIds, kw, largePageable);
                
                // 기존 데이터 호환성: category_id가 null이지만 category(enum)이 일치하는 게시글도 조회
                if (legacyCategory != null) {
                    Page<Post> legacyPage = postRepository.findByIsNoticeFalseAndDeletedFalseAndCategoryAndTitleContainingIgnoreCase(legacyCategory, kw, largePageable);
                    legacyPosts = legacyPage.getContent().stream()
                            .filter(p -> p.getCategoryId() == null && !p.getDeleted()) // category_id가 null이고 삭제되지 않은 것만
                            .toList();
                }
            }
        } else {
            // categoryId가 없으면 전체 조회 (공지사항 제외, 삭제되지 않은 것만)
            if (kw == null || kw.isBlank()) {
                page = postRepository.findByIsNoticeFalseAndDeletedFalse(adjustedPageable);
            } else {
                page = postRepository.findByIsNoticeFalseAndDeletedFalseAndTitleContainingIgnoreCase(kw, adjustedPageable);
            }
        }

        // 일반 글 매핑 (category_id 기반)
        List<PostListItemResponse> normalItems = page.getContent().stream()
                .map(this::toListItem)
                .toList();
        
        // 기존 게시글 매핑 (category enum 기반)
        List<PostListItemResponse> legacyItems = legacyPosts.stream()
                .map(this::toListItem)
                .toList();
        
        // 중복 제거 (같은 ID가 있으면 제거)
        java.util.Set<Long> existingIds = normalItems.stream()
                .map(PostListItemResponse::id)
                .collect(java.util.stream.Collectors.toSet());
        List<PostListItemResponse> uniqueLegacyItems = legacyItems.stream()
                .filter(item -> !existingIds.contains(item.id()))
                .toList();
        
        log.debug("PostService.list - noticeCount={}, normalItems.size()={}, legacyItems.size()={}, uniqueLegacyItems.size()={}, categoryId={}, keyword={}", 
                noticeCount, normalItems.size(), legacyItems.size(), uniqueLegacyItems.size(), categoryId, kw);
        
        // 일반 글과 기존 게시글 합치기 (정렬: 최신순)
        List<PostListItemResponse> combinedItems = new ArrayList<>(normalItems);
        combinedItems.addAll(uniqueLegacyItems);
        // 최신순 정렬
        combinedItems.sort((a, b) -> b.createdAt().compareTo(a.createdAt()));
        
        // 페이징 처리 (합쳐진 리스트에서 페이지 크기만큼만 가져오기)
        int start = (isFirstPage && noticeCount > 0) 
                ? Math.max(0, pageable.getPageNumber() * pageable.getPageSize() - noticeCount)
                : pageable.getPageNumber() * pageable.getPageSize();
        int pageSize = (isFirstPage && noticeCount > 0)
                ? Math.max(1, pageable.getPageSize() - noticeCount)
                : pageable.getPageSize();
        int end = Math.min(start + pageSize, combinedItems.size());
        List<PostListItemResponse> pagedItems = start < combinedItems.size() 
                ? combinedItems.subList(Math.max(0, start), end)
                : List.of();
        
        // 1페이지인 경우 공지사항을 상단에 추가
        List<PostListItemResponse> allItems;
        if (isFirstPage) {
            allItems = new ArrayList<>(noticeItems);
            allItems.addAll(pagedItems);
        } else {
            allItems = pagedItems;
        }
        
        // 전체 개수는 공지사항 + 일반 글 개수 + 기존 게시글 개수 (중복 제거 후)
        long totalCombinedElements = normalItems.size() + uniqueLegacyItems.size();
        long totalElements = noticeCount + totalCombinedElements;
        int totalPages = (int) Math.ceil((double) totalCombinedElements / pageable.getPageSize());

        return PageResponse.of(
                allItems,
                pageable.getPageNumber(),
                pageable.getPageSize(),
                totalElements,
                totalPages,
                pageable.getPageNumber() < totalPages - 1,
                pageable.getPageNumber() > 0
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
        // categoryId는 필수
        if (req.categoryId() == null) {
            throw new IllegalArgumentException("categoryId is required");
        }
        
        Category category = categoryRepository.findById(req.categoryId())
                .orElseThrow(() -> new NotFoundException("Category", req.categoryId()));
        
        Post post = new Post(req.title(), null);
        post.changeCategoryId(req.categoryId());
        post.changeIsNotice(req.isNotice() != null ? req.isNotice() : false);
        // 데이터베이스 스키마 호환성을 위해 category 필드에 기본값 설정 (deprecated)
        post.changeCategory(PostCategory.TRAINING);
        
        Post saved = postRepository.save(post);

        String mdPath = storage.saveNew(req.contentMd(), saved.getId());
        saved.changeContentMdPath(mdPath);

        // 버전 정보 저장 (초기 버전)
        savePostVersion(saved.getId(), req.contentMd());

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PostDetailResponse getDetail(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));
        
        // 삭제된 게시글은 조회 불가
        if (post.getDeleted()) {
            throw new NotFoundException("Post not found: " + id);
        }

        String mdPath = post.getContentMdPath();
        String md = (mdPath == null || mdPath.isBlank())
                ? null
                : storage.read(mdPath);

        return new PostDetailResponse(
                post.getId(),
                post.getTitle(),
                post.getCategory(), // 기존 데이터 호환성
                post.getCategoryId(),
                post.getIsNotice(),
                md,
                post.getViewCount(),
                post.getAttachments(),
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }

    @Transactional
    public void incrementViewCount(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));
        post.incrementViewCount();
        postRepository.save(post);
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
        
        // 내용 변경 시 새 버전 저장
        savePostVersion(post.getId(), req.contentMd());
        
        return toResponse(post);
    }

    @Transactional
    public PostResponse createByUpload(MultipartFile file, String title, PostCategory category, Long categoryId, Boolean isNotice, List<MultipartFile> images, List<MultipartFile> attachments) {
        String md = readMarkdownFromMultipart(file);
        
        // 업로드된 이미지 파일들을 파일명으로 매핑
        Map<String, MultipartFile> imageMap = buildImageMap(images);
        
        // 마크다운 내 이미지 처리 (웹 URL 다운로드, 로컬 파일 매칭, 서버 저장, 경로 교체)
        md = imageProcessor.processImages(md, imageMap);

        String finalTitle = (title == null || title.isBlank())
                ? extractTitleOrDefault(md)
                : title;

        // categoryId는 필수 (category 파라미터는 더 이상 사용하지 않음)
        if (categoryId == null) {
            throw new IllegalArgumentException("categoryId is required");
        }
        
        Category cat = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new NotFoundException("Category", categoryId));
        
        Post post = new Post(finalTitle, null);
        post.changeCategoryId(categoryId);
        post.changeIsNotice(isNotice != null ? isNotice : false);
        // 데이터베이스 스키마 호환성을 위해 category 필드에 기본값 설정 (deprecated)
        post.changeCategory(PostCategory.TRAINING);
        
        // 첨부파일 저장
        if (attachments != null && !attachments.isEmpty()) {
            try {
                List<String> attachmentUrls = attachmentStorage.saveAttachments(attachments);
                String attachmentsJson = attachmentUrls.stream()
                        .map(url -> "\"" + url.replace("\"", "\\\"") + "\"")
                        .collect(Collectors.joining(",", "[", "]"));
                post.changeAttachments(attachmentsJson);
            } catch (IOException e) {
                throw new IllegalStateException("Failed to save attachments", e);
            }
        }
        
        Post saved = postRepository.save(post);
        String mdPath = storage.saveNew(md, saved.getId());
        saved.changeContentMdPath(mdPath);

        // 버전 정보 저장 (초기 버전)
        savePostVersion(saved.getId(), md);

        return toResponse(saved);
    }

    private Map<String, MultipartFile> buildImageMap(List<MultipartFile> images) {
        if (images == null || images.isEmpty()) {
            return Map.of();
        }
        Map<String, MultipartFile> map = new HashMap<>();
        for (MultipartFile img : images) {
            if (img != null && !img.isEmpty()) {
                String filename = img.getOriginalFilename();
                if (filename != null && !filename.isBlank()) {
                    map.put(filename, img);
                }
            }
        }
        return map;
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
    public PostResponse updateByUpload(Long id, MultipartFile file, String title, List<MultipartFile> images, List<MultipartFile> attachments) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        // 1. 업로드 파일 → markdown 텍스트
        String markdown = readMarkdownFromMultipart(file);
        
        // 2. 업로드된 이미지 파일들을 파일명으로 매핑
        Map<String, MultipartFile> imageMap = buildImageMap(images);
        
        // 3. 마크다운 내 이미지 처리 (웹 URL 다운로드, 로컬 파일 매칭, 서버 저장, 경로 교체)
        markdown = imageProcessor.processImages(markdown, imageMap);

        // 4. title이 넘어오면 갱신 (선택)
        if (title != null && !title.isBlank()) {
            post.changeTitle(title);
        }

        // 5. 첨부파일 업데이트 (새 첨부파일이 있으면 기존 것 삭제 후 저장)
        if (attachments != null && !attachments.isEmpty()) {
            // 기존 첨부파일 삭제
            String oldAttachments = post.getAttachments();
            if (oldAttachments != null && !oldAttachments.isBlank()) {
                try {
                    List<String> oldUrls = parseAttachmentUrls(oldAttachments);
                    attachmentStorage.deleteAttachments(oldUrls);
                } catch (Exception e) {
                    log.warn("Failed to delete old attachments: {}", e.getMessage());
                }
            }
            
            // 새 첨부파일 저장
            try {
                List<String> attachmentUrls = attachmentStorage.saveAttachments(attachments);
                String attachmentsJson = attachmentUrls.stream()
                        .map(url -> "\"" + url.replace("\"", "\\\"") + "\"")
                        .collect(Collectors.joining(",", "[", "]"));
                post.changeAttachments(attachmentsJson);
            } catch (IOException e) {
                throw new IllegalStateException("Failed to save attachments", e);
            }
        }

        // 6. 기존 contentMdPath 확인 (없으면 기존 글 전용 메서드로 경로 생성·덮어쓰기)
        String mdPath = post.getContentMdPath();
        if (mdPath == null || mdPath.isBlank()) {
            mdPath = storage.writeOrOverwriteForExistingPost(markdown, post.getId());
            post.changeContentMdPath(mdPath);
        } else {
            storage.overwrite(mdPath, markdown);
        }
        
        // 내용 변경 시 새 버전 저장
        savePostVersion(post.getId(), markdown);

        return toResponse(post);
    }

    private List<String> parseAttachmentUrls(String json) {
        if (json == null || json.isBlank() || !json.startsWith("[") || !json.endsWith("]")) {
            return new ArrayList<>();
        }
        String content = json.substring(1, json.length() - 1).trim();
        if (content.isEmpty()) {
            return new ArrayList<>();
        }
        List<String> urls = new ArrayList<>();
        String[] parts = content.split(",");
        for (String part : parts) {
            String trimmed = part.trim();
            if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
                urls.add(trimmed.substring(1, trimmed.length() - 1));
            }
        }
        return urls;
    }

    /**
     * 게시글 완전 삭제 (hard delete)
     * @deprecated 일반적으로는 soft delete를 사용하세요. 관리자 기능 등 특수한 경우에만 사용.
     */
    @Deprecated
    @Transactional
    public void hardDelete(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        String mdPath = post.getContentMdPath();
        String attachments = post.getAttachments();

        // 1) 첨부파일 삭제
        if (attachments != null && !attachments.isBlank()) {
            try {
                List<String> urls = parseAttachmentUrls(attachments);
                attachmentStorage.deleteAttachments(urls);
            } catch (Exception e) {
                log.warn("Failed to delete attachments: {}", e.getMessage());
            }
        }

        // 2) DB 삭제 요청
        postRepository.delete(post);

        // 3) 마크다운 파일 삭제 (없으면 통과)
        storage.deleteIfExists(mdPath);
    }

    @Transactional
    public PostResponse patch(Long id, PostPatchRequest req) {
        if ((req.title() == null || req.title().isBlank())
                && req.categoryId() == null
                && (req.markdown() == null)) {
            throw new IllegalArgumentException("Nothing to update");
        }

        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        // 삭제된 게시글은 수정 불가
        if (post.getDeleted()) {
            throw new NotFoundException("Post not found: " + id);
        }

        // 1) title 갱신
        if (req.title() != null && !req.title().isBlank()) {
            post.changeTitle(req.title());
        }

        // 2) categoryId 갱신
        if (req.categoryId() != null) {
            Category category = categoryRepository.findById(req.categoryId())
                    .orElseThrow(() -> new NotFoundException("Category", req.categoryId()));
            post.changeCategoryId(req.categoryId());
        }

        // 2-2) isNotice 갱신
        if (req.isNotice() != null) {
            post.changeIsNotice(req.isNotice());
        }

        // 3) markdown 갱신(경로 없으면 기존 글 전용 메서드로 경로 생성·덮어쓰기)
        if (req.markdown() != null) {
            String mdPath = post.getContentMdPath();
            if (mdPath == null || mdPath.isBlank()) {
                mdPath = storage.writeOrOverwriteForExistingPost(req.markdown(), post.getId());
                post.changeContentMdPath(mdPath);
                entityManager.flush();
            } else {
                storage.overwrite(mdPath, req.markdown());
            }
            
            // 내용 변경 시 새 버전 저장
            savePostVersion(post.getId(), req.markdown());
        }

        return toResponse(post);
    }

    @Transactional
    public PostResponse addAttachments(Long id, List<MultipartFile> attachments) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        if (attachments == null || attachments.isEmpty()) {
            return toResponse(post);
        }

        try {
            // 새 첨부파일 저장
            List<String> newAttachmentUrls = attachmentStorage.saveAttachments(attachments);
            
            // 기존 첨부파일 가져오기
            String existingAttachments = post.getAttachments();
            List<String> allUrls = new ArrayList<>();
            
            if (existingAttachments != null && !existingAttachments.isBlank() && !existingAttachments.equals("null") && !existingAttachments.equals("[]")) {
                allUrls.addAll(parseAttachmentUrls(existingAttachments));
            }
            
            // 새 첨부파일 추가
            allUrls.addAll(newAttachmentUrls);
            
            // JSON 배열로 변환하여 저장
            String attachmentsJson = allUrls.stream()
                    .map(url -> "\"" + url.replace("\"", "\\\"") + "\"")
                    .collect(Collectors.joining(",", "[", "]"));
            post.changeAttachments(attachmentsJson);
            
            postRepository.save(post);
            
            return toResponse(post);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to save attachments", e);
        }
    }

    /**
     * (기존) FE 임시용: category 목록만 받아서 전체 조회(페이징 없음)
     * @deprecated categoryId 기반으로 변경되었습니다.
     */
    @Deprecated
    @Transactional(readOnly = true)
    public List<PostListItemResponse> list(List<PostCategory> categories) {
        // 더 이상 사용하지 않지만 호환성을 위해 유지
        return postRepository.findAll().stream()
                .filter(p -> !p.getDeleted()) // 삭제되지 않은 것만
                .map(this::toListItem)
                .toList();
    }

    /**
     * 게시글 내용 변경 시 새 버전 저장
     */
    private void savePostVersion(Long postId, String contentMd) {
        if (contentMd == null || contentMd.isBlank()) {
            return; // 내용이 없으면 버전 저장하지 않음
        }
        
        Integer nextVersionNumber = postVersionRepository.getNextVersionNumber(postId);
        PostVersion version = new PostVersion(postId, nextVersionNumber, contentMd);
        PostVersion savedVersion = postVersionRepository.save(version);
        
        // Post 엔티티의 currentVersionId 업데이트
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Post not found: " + postId));
        post.changeCurrentVersionId(savedVersion.getId());
        postRepository.save(post);
    }

    /**
     * 게시글의 모든 버전 조회 (삭제된 게시글 포함)
     */
    @Transactional(readOnly = true)
    public List<PostVersion> getVersions(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Post not found: " + postId));
        
        return postVersionRepository.findByPostIdOrderByVersionNumberDesc(postId);
    }

    /**
     * 특정 버전 조회 (삭제된 게시글 포함)
     */
    @Transactional(readOnly = true)
    public PostVersion getVersion(Long postId, Integer versionNumber) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Post not found: " + postId));
        
        return postVersionRepository.findByPostIdAndVersionNumber(postId, versionNumber)
                .orElseThrow(() -> new NotFoundException("Version not found: postId=" + postId + ", versionNumber=" + versionNumber));
    }

    /**
     * 삭제된 게시글 목록 조회 (버전 이력 페이지용)
     */
    @Transactional(readOnly = true)
    public PageResponse<PostListItemResponse> listDeleted(Pageable pageable, String keyword, Long postId) {
        List<Post> posts;
        
        if (postId != null) {
            // ID로 검색
            posts = postRepository.findByDeletedTrueAndId(postId);
        } else if (keyword != null && !keyword.trim().isEmpty()) {
            // 키워드로 검색 (전체 조회 후 필터링)
            String kw = keyword.trim();
            Page<Post> page = postRepository.findByDeletedTrueAndTitleContainingIgnoreCase(kw, pageable);
            posts = page.getContent();
            // 페이징 정보는 page 객체에서 가져옴
            List<PostListItemResponse> items = posts.stream()
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
        } else {
            // 전체 조회
            Page<Post> page = postRepository.findByDeletedTrue(pageable);
            posts = page.getContent();
            List<PostListItemResponse> items = posts.stream()
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
        
        // ID로 검색한 경우 (페이징 없이 전체 반환)
        List<PostListItemResponse> items = posts.stream()
                .map(this::toListItem)
                .toList();
        
        return PageResponse.of(
                items,
                0,
                items.size(),
                (long) items.size(),
                1,
                false,
                false
        );
    }

    /**
     * 삭제 이력 조회 (최신순)
     */
    @Transactional(readOnly = true)
    public List<PostListItemResponse> getDeletionHistory() {
        List<Post> deletedPosts = postRepository.findByDeletedTrueOrderByUpdatedAtDesc();
        return deletedPosts.stream()
                .map(this::toListItem)
                .toList();
    }

    /**
     * 전체 변경 이력 조회 (생성, 수정, 삭제 통합)
     * @param changeType 필터: null(전체), "생성", "수정", "삭제"
     */
    @Transactional(readOnly = true)
    public List<com.fasoo.cs_doc.post.dto.ChangeHistoryItem> getAllChangeHistory(String changeType) {
        List<com.fasoo.cs_doc.post.dto.ChangeHistoryItem> history = new ArrayList<>();
        
        // 1. 모든 버전 조회 (생성/수정 이력)
        List<PostVersion> allVersions = postVersionRepository.findAllByOrderByCreatedAtDesc();
        
        // 각 버전에 대해 게시글 정보 조회
        Map<Long, Post> postCache = new HashMap<>();
        for (PostVersion version : allVersions) {
            Post post = postCache.computeIfAbsent(version.getPostId(), id -> 
                postRepository.findById(id).orElse(null)
            );
            
            if (post == null) continue;
            
            PostListItemResponse postItem = toListItem(post);
            String type = version.getVersionNumber() == 1 ? "생성" : "수정";
            
            if (changeType == null || changeType.equals(type)) {
                if (type.equals("생성")) {
                    history.add(com.fasoo.cs_doc.post.dto.ChangeHistoryItem.create(
                            postItem, version.getVersionNumber(), version.getCreatedAt()
                    ));
                } else {
                    history.add(com.fasoo.cs_doc.post.dto.ChangeHistoryItem.update(
                            postItem, version.getVersionNumber(), version.getCreatedAt()
                    ));
                }
            }
        }
        
        // 2. 삭제 이력 추가
        if (changeType == null || changeType.equals("삭제")) {
            List<Post> deletedPosts = postRepository.findByDeletedTrueOrderByUpdatedAtDesc();
            for (Post deletedPost : deletedPosts) {
                PostListItemResponse postItem = toListItem(deletedPost);
                history.add(com.fasoo.cs_doc.post.dto.ChangeHistoryItem.delete(postItem));
            }
        }
        
        // 변경일 기준 내림차순 정렬
        history.sort((a, b) -> b.changeDate().compareTo(a.changeDate()));
        
        return history;
    }

    /**
     * 게시글 삭제 (soft delete)
     * 삭제된 게시글은 목록에서 보이지 않지만 데이터베이스에는 유지되어 추후 복구 가능합니다.
     */
    @Transactional
    public void delete(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));
        
        // 이미 삭제된 경우 무시
        if (post.getDeleted()) {
            return;
        }
        
        post.markAsDeleted();
        postRepository.save(post);
    }
}
