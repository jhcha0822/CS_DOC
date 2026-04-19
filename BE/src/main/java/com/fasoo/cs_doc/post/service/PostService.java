package com.fasoo.cs_doc.post.service;

import com.fasoo.cs_doc.category.domain.Category;
import com.fasoo.cs_doc.category.repository.CategoryRepository;
import com.fasoo.cs_doc.global.exception.NotFoundException;
import com.fasoo.cs_doc.global.page.PageResponse;
import com.fasoo.cs_doc.member.repository.MemberRepository;
import com.fasoo.cs_doc.post.domain.Post;
import com.fasoo.cs_doc.post.repository.CommentRepository;
import com.fasoo.cs_doc.post.domain.PostCategory;
import com.fasoo.cs_doc.post.domain.PostKind;
import com.fasoo.cs_doc.post.domain.PostVersion;
import com.fasoo.cs_doc.post.dto.*;
import com.fasoo.cs_doc.assignment.domain.AssignmentTask;
import com.fasoo.cs_doc.assignment.dto.AssignmentTaskItemRequest;
import com.fasoo.cs_doc.assignment.repository.AssignmentTaskRepository;
import com.fasoo.cs_doc.member.domain.UserRole;
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
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class PostService {
    
    private static final Logger log = LoggerFactory.getLogger(PostService.class);

    private final PostRepository postRepository;
    private final PostVersionRepository postVersionRepository;
    private final AssignmentTaskRepository assignmentTaskRepository;
    private final PostContentStorage storage;
    private final CategoryRepository categoryRepository;
    private final MarkdownImageProcessor imageProcessor;
    private final AttachmentStorage attachmentStorage;
    private final MemberRepository memberRepository;
    private final CommentRepository commentRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public PostService(PostRepository postRepository, PostVersionRepository postVersionRepository, AssignmentTaskRepository assignmentTaskRepository, PostContentStorage storage, CategoryRepository categoryRepository, MarkdownImageProcessor imageProcessor, AttachmentStorage attachmentStorage, MemberRepository memberRepository, CommentRepository commentRepository) {
        this.postRepository = postRepository;
        this.postVersionRepository = postVersionRepository;
        this.assignmentTaskRepository = assignmentTaskRepository;
        this.storage = storage;
        this.categoryRepository = categoryRepository;
        this.imageProcessor = imageProcessor;
        this.attachmentStorage = attachmentStorage;
        this.memberRepository = memberRepository;
        this.commentRepository = commentRepository;
    }

    /**
     * 카테고리 ID와 그 하위 카테고리들의 ID 목록 반환 (카테고리 계층 구조 지원)
     * findAll로 전체 카테고리 로드 후 parentId 기준으로 하위 ID를 수집하여 계층 구조를 정확히 반영
     */
    private List<Long> getCategoryIdsIncludingChildren(Long categoryId) {
        categoryRepository.findById(categoryId)
                .orElseThrow(() -> new NotFoundException("Category", categoryId));

        List<Category> allCategories = categoryRepository.findAllByOrderBySortOrderAsc();
        Map<Long, List<Category>> parentToChildren = new HashMap<>();
        for (Category c : allCategories) {
            Long pid = c.getParentId();
            parentToChildren.computeIfAbsent(pid != null ? pid : -1L, k -> new ArrayList<>()).add(c);
        }

        List<Long> result = new ArrayList<>();
        collectCategoryIdsRecursive(categoryId, parentToChildren, result);
        return result;
    }

    private void collectCategoryIdsRecursive(Long categoryId, Map<Long, List<Category>> parentToChildren, List<Long> result) {
        result.add(categoryId);
        List<Category> children = parentToChildren.getOrDefault(categoryId, List.of());
        for (Category child : children) {
            if (child.getId() != null) {
                collectCategoryIdsRecursive(child.getId(), parentToChildren, result);
            }
        }
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
        
        String createdByName = getUserName(p.getCreatedBy());
        String updatedByName = getUserName(p.getUpdatedBy());
        long commentCount = commentRepository.countByPostId(p.getId());
        
        return new PostListItemResponse(
                p.getId(),
                p.getTitle(),
                category,
                p.getCategoryId(),
                p.getPostKind(),
                p.getIsNotice(),
                p.getViewCount(),
                p.getAttachments(),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                createdByName,
                updatedByName,
                commentCount
        );
    }

    private String getUserName(Long userId) {
        if (userId == null) return null;
        return memberRepository.findById(userId)
                .map(m -> m.getName())
                .orElse(null);
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
    public PageResponse<PostListItemResponse> list(Pageable pageable, String keyword, String searchIn, List<String> categories, Long categoryId, PostKind postKind) {
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
        List<Post> legacyPosts = new ArrayList<>();

        if (categoryId != null) {
            // categoryId가 있으면 해당 카테고리와 하위 카테고리들의 ID 목록 조회
            Category selectedCategory = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new NotFoundException("Category", categoryId));
            List<Long> targetCategoryIds = getCategoryIdsIncludingChildren(categoryId);
            log.debug("PostService.list - categoryId={}, targetCategoryIds={} (총 {}개)", categoryId, targetCategoryIds, targetCategoryIds.size());

            // 공지사항 카테고리인지 확인
            boolean isNoticeCategory = "CAT_NOTICE".equals(selectedCategory.getCode()) || "공지사항".equals(selectedCategory.getLabel());

            // 선택된 카테고리와 하위 카테고리들의 code를 PostCategory enum으로 매핑 (기존 데이터 호환성)
            List<PostCategory> legacyCategories = new ArrayList<>();
            PostCategory selectedLegacy = categoryCodeToPostCategory(selectedCategory.getCode());
            if (selectedLegacy != null) {
                legacyCategories.add(selectedLegacy);
            }
            List<Category> allCats = categoryRepository.findAllByOrderBySortOrderAsc();
            for (Long cid : targetCategoryIds) {
                allCats.stream()
                        .filter(c -> cid.equals(c.getId()))
                        .findFirst()
                        .map(Category::getCode)
                        .map(this::categoryCodeToPostCategory)
                        .filter(java.util.Objects::nonNull)
                        .filter(lc -> !legacyCategories.contains(lc))
                        .ifPresent(legacyCategories::add);
            }

            // category_id 기반 + legacy category(enum) 별도 조회 후 병합
            Pageable largePageable = org.springframework.data.domain.PageRequest.of(0, 10000, pageable.getSort());
            if (kw == null || kw.isBlank()) {
                // 공지사항 카테고리인 경우 공지사항도 포함하여 조회
                if (isNoticeCategory) {
                    page = postRepository.findByDeletedFalseAndCategoryIdIn(targetCategoryIds, largePageable);
                } else if (postKind != null) {
                    page = postRepository.findByIsNoticeFalseAndDeletedFalseAndCategoryIdInAndPostKind(targetCategoryIds, postKind, largePageable);
                } else {
                    page = postRepository.findByIsNoticeFalseAndDeletedFalseAndCategoryIdIn(targetCategoryIds, largePageable);
                }
                for (PostCategory legacyCategory : legacyCategories) {
                    List<Post> batch = postRepository.findByIsNoticeFalseAndDeletedFalseAndCategory(legacyCategory, largePageable)
                            .getContent().stream()
                            .filter(p -> p.getCategoryId() == null && !p.getDeleted())
                            .toList();
                    legacyPosts.addAll(batch);
                }
            } else {
                // 공지사항 카테고리인 경우 공지사항도 포함하여 조회
                if (isNoticeCategory) {
                    page = postRepository.findByDeletedFalseAndCategoryIdInAndTitleContainingIgnoreCase(targetCategoryIds, kw, largePageable);
                } else if (postKind != null) {
                    page = postRepository.findByIsNoticeFalseAndDeletedFalseAndCategoryIdInAndPostKindAndTitleContainingIgnoreCase(targetCategoryIds, postKind, kw, largePageable);
                } else {
                    page = postRepository.findByIsNoticeFalseAndDeletedFalseAndCategoryIdInAndTitleContainingIgnoreCase(targetCategoryIds, kw, largePageable);
                }
                for (PostCategory legacyCategory : legacyCategories) {
                    List<Post> batch = postRepository.findByIsNoticeFalseAndDeletedFalseAndCategoryAndTitleContainingIgnoreCase(legacyCategory, kw, largePageable)
                            .getContent().stream()
                            .filter(p -> p.getCategoryId() == null && !p.getDeleted())
                            .toList();
                    legacyPosts.addAll(batch);
                }
            }
        } else {
            // categoryId가 없으면 전체 조회 (공지사항 제외, 삭제되지 않은 것만)
            // 메모리 페이징을 위해 전체 데이터를 먼저 가져옴
            Pageable largePageable = org.springframework.data.domain.PageRequest.of(0, 10000, pageable.getSort());
            if (kw == null || kw.isBlank()) {
                page = postRepository.findByIsNoticeFalseAndDeletedFalse(largePageable);
            } else {
                page = postRepository.findByIsNoticeFalseAndDeletedFalseAndTitleContainingIgnoreCase(kw, largePageable);
            }
            // 전체 조회 시에도 legacy(categoryId=null, category enum만 있는) 게시글 병합 (유실 방지)
            List<Category> allCats = categoryRepository.findAllByOrderBySortOrderAsc();
            for (Category c : allCats) {
                PostCategory legacy = categoryCodeToPostCategory(c.getCode());
                if (legacy == null) continue;
                List<Post> batch = postRepository.findByIsNoticeFalseAndDeletedFalseAndCategory(legacy, largePageable)
                        .getContent().stream()
                        .filter(p -> p.getCategoryId() == null && !p.getDeleted())
                        .toList();
                legacyPosts.addAll(batch);
            }
        }

        List<PostListItemResponse> normalItems = page.getContent().stream()
                .map(this::toListItem)
                .toList();
        List<PostListItemResponse> legacyItems = legacyPosts.stream()
                .map(this::toListItem)
                .toList();
        java.util.Set<Long> existingIds = normalItems.stream()
                .map(PostListItemResponse::id)
                .collect(java.util.stream.Collectors.toSet());
        List<PostListItemResponse> uniqueLegacyItems = legacyItems.stream()
                .filter(item -> !existingIds.contains(item.id()))
                .toList();
        List<PostListItemResponse> combinedItems = new ArrayList<>(normalItems);
        combinedItems.addAll(uniqueLegacyItems);
        combinedItems.sort((a, b) -> b.createdAt().compareTo(a.createdAt()));
        
        log.debug("PostService.list - noticeCount={}, normalItems.size()={}, legacyItems.size()={}, categoryId={}, keyword={}", 
                noticeCount, normalItems.size(), uniqueLegacyItems.size(), categoryId, kw);
        
        // 페이징 처리 (합쳐진 리스트에서 페이지 크기만큼만 가져오기. 1페이지에 공지가 있으면 그만큼 일반 글 수 감소)
        int pageSize = pageable.getPageSize();
        int start;
        int sliceSize;
        if (isFirstPage && noticeCount > 0) {
            sliceSize = Math.max(1, pageSize - noticeCount);
            start = 0;
        } else {
            sliceSize = pageSize;
            start = (noticeCount > 0)
                    ? (pageSize - noticeCount) + (pageable.getPageNumber() - 1) * pageSize
                    : pageable.getPageNumber() * pageSize;
        }
        int end = Math.min(start + sliceSize, combinedItems.size());
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
        
        // 전체 개수: 공지 + 일반(combined). totalPages는 전체 기준으로 일관되게 계산
        long totalCombinedElements = combinedItems.size();
        long totalElements = noticeCount + totalCombinedElements;
        int totalPages = (int) Math.ceil((double) totalElements / pageable.getPageSize());

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
        return list(pageable, keyword, null, null, null, null);
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
        if (req.summaryTitle() != null) {
            post.changeSummaryTitle(req.summaryTitle());
        }
        post.changeCategoryId(req.categoryId());
        post.changeIsNotice(req.isNotice() != null ? req.isNotice() : false);
        if (req.postKind() != null) {
            post.changePostKind(req.postKind());
            if (req.postKind() == PostKind.ASSIGNMENT) {
                // 과제인 경우 maxScore 설정 (기본값 100)
                post.changeMaxScore(req.maxScore() != null ? req.maxScore() : 100);
            }
        }
        // 데이터베이스 스키마 호환성을 위해 category 필드에 기본값 설정 (deprecated)
        post.changeCategory(PostCategory.TRAINING);
        // 작성자 정보 기록
        if (req.userId() != null) {
            post.changeCreatedBy(req.userId());
            post.changeUpdatedBy(req.userId());
        }
        
        Post saved = postRepository.save(post);

        String mdPath = storage.saveNew(req.contentMd(), saved.getId());
        saved.changeContentMdPath(mdPath);

        // 버전 정보 저장 (초기 버전)
        savePostVersion(saved.getId(), req.title(), req.contentMd(), true, saved.getUpdatedBy());

        // ASSIGNMENT인 경우 세부 실습 목록 저장 (배점 합 = maxScore)
        if (saved.getPostKind() == PostKind.ASSIGNMENT && req.tasks() != null && !req.tasks().isEmpty()) {
            int totalScore = req.tasks().stream().mapToInt(AssignmentTaskItemRequest::maxScore).sum();
            int expectedScore = saved.getMaxScore() != null && saved.getMaxScore() > 0 ? saved.getMaxScore() : 100;
            if (totalScore != expectedScore) {
                throw new IllegalArgumentException("세부 실습 배점 합이 " + expectedScore + "점이어야 합니다. 현재 합: " + totalScore);
            }
            int sortOrder = 0;
            for (AssignmentTaskItemRequest t : req.tasks()) {
                AssignmentTask task = new AssignmentTask(saved.getId(), t.title(), sortOrder++, t.maxScore(), t.difficulty());
                AssignmentTask savedTask = assignmentTaskRepository.save(task);
                String path = storage.writeAssignmentTaskDescription(saved.getId(), savedTask.getId(), t.descriptionMarkdown() != null ? t.descriptionMarkdown() : "");
                savedTask.changeDescriptionMdPath(path);
                assignmentTaskRepository.save(savedTask);
            }
        }

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

        String createdByName = getUserName(post.getCreatedBy());
        String updatedByName = getUserName(post.getUpdatedBy());
        
        // 최신 버전 번호 조회
        Integer versionNumber = postVersionRepository.findFirstByPostIdOrderByVersionNumberDesc(post.getId())
                .map(PostVersion::getVersionNumber)
                .orElse(1); // 버전이 없으면 1로 설정

        // ASSIGNMENT인 경우 세부 실습 목록 (수정 폼용)
        List<PostDetailResponse.AssignmentTaskDetail> assignmentTasks = null;
        if (post.getPostKind() == PostKind.ASSIGNMENT) {
            List<AssignmentTask> tasks = assignmentTaskRepository.findByPostIdOrderBySortOrderAsc(post.getId());
            assignmentTasks = tasks.stream()
                    .map(task -> {
                        String descMd = task.getDescriptionMdPath() != null && !task.getDescriptionMdPath().isBlank()
                                ? storage.readOptional(task.getDescriptionMdPath())
                                : "";
                        return new PostDetailResponse.AssignmentTaskDetail(
                                task.getId(),
                                task.getTitle(),
                                descMd,
                                task.getSortOrder(),
                                task.getMaxScore(),
                                task.getDifficulty() != null ? task.getDifficulty() : "MEDIUM"
                        );
                    })
                    .toList();
        }
        
        return new PostDetailResponse(
                post.getId(),
                post.getTitle(),
                post.getSummaryTitle(),
                post.getCategory(), // 기존 데이터 호환성
                post.getCategoryId(),
                post.getIsNotice(),
                md,
                post.getViewCount(),
                post.getAttachments(),
                post.getCreatedAt(),
                post.getUpdatedAt(),
                createdByName,
                updatedByName,
                versionNumber,
                post.getPostKind(),
                post.getMaxScore(),
                assignmentTasks
        );
    }

    @Transactional
    public void incrementViewCount(Long id) {
        if (postRepository.findById(id).isEmpty()) {
            throw new NotFoundException("Post not found: " + id);
        }
        postRepository.incrementViewCountById(id);
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

        // 수정자 정보 기록
        if (req.userId() != null) {
            post.changeUpdatedBy(req.userId());
        }
        postRepository.save(post);

        post.changeTitle(req.title());
        storage.overwrite(mdPath, req.contentMd());
        
        // 내용 변경 시 새 버전 저장
        savePostVersion(post.getId(), req.title(), req.contentMd(), true, post.getUpdatedBy());
        
        return toResponse(post);
    }

    @Transactional
    public PostResponse createByUpload(MultipartFile file, String title, PostCategory category, Long categoryId, Boolean isNotice, List<MultipartFile> images, List<MultipartFile> attachments, Long userId, PostKind postKind) {
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
        if (cat.isAdminOnly()) {
            boolean isAdmin = userId != null && memberRepository.findById(userId)
                    .map(m -> m.getRole() == UserRole.ADMIN)
                    .orElse(false);
            if (!isAdmin) {
                throw new IllegalArgumentException("관리자 전용 카테고리에는 관리자만 등록할 수 있습니다.");
            }
        }

        Post post = new Post(finalTitle, null);
        post.changeCategoryId(categoryId);
        post.changeIsNotice(isNotice != null ? isNotice : false);
        if (postKind != null) {
            post.changePostKind(postKind);
        }
        // 데이터베이스 스키마 호환성을 위해 category 필드에 기본값 설정 (deprecated)
        post.changeCategory(PostCategory.TRAINING);
        // 작성자 정보 기록
        if (userId != null) {
            post.changeCreatedBy(userId);
            post.changeUpdatedBy(userId);
        }
        
        // 첨부파일 저장
        if (attachments != null && !attachments.isEmpty()) {
            try {
                List<AttachmentInfo> infos = attachmentStorage.saveAttachments(attachments);
                String attachmentsJson = buildAttachmentsJson(infos);
                post.changeAttachments(attachmentsJson);
            } catch (IOException e) {
                throw new IllegalStateException("Failed to save attachments", e);
            }
        }
        
        Post saved = postRepository.save(post);
        String mdPath = storage.saveNew(md, saved.getId());
        saved.changeContentMdPath(mdPath);

        // 버전 정보 저장 (초기 버전)
        savePostVersion(saved.getId(), finalTitle, md, true, saved.getUpdatedBy());

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
    public PostResponse updateByUpload(Long id, MultipartFile file, String title, List<MultipartFile> images, List<MultipartFile> attachments, Long userId) {
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
                List<AttachmentInfo> infos = attachmentStorage.saveAttachments(attachments);
                String attachmentsJson = buildAttachmentsJson(infos);
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
        
        // 수정자 정보 기록
        if (userId != null) {
            post.changeUpdatedBy(userId);
        }
        postRepository.save(post);

        // 내용 변경 시 새 버전 저장
        savePostVersion(post.getId(), post.getTitle(), markdown, true, post.getUpdatedBy());

        return toResponse(post);
    }

    private List<String> parseAttachmentUrls(String json) {
        List<AttachmentInfo> infos = parseAttachmentInfos(json);
        return infos.stream().map(AttachmentInfo::url).toList();
    }

    /**
     * 첨부파일 JSON 파싱. 구형 ["url"] 형식과 신형 [{"url":"...","name":"..."}] 형식 모두 지원
     */
    private List<AttachmentInfo> parseAttachmentInfos(String json) {
        if (json == null || json.isBlank() || !json.startsWith("[")) {
            return new ArrayList<>();
        }
        List<AttachmentInfo> result = new ArrayList<>();
        String content = json.substring(1, json.endsWith("]") ? json.length() - 1 : json.length()).trim();
        if (content.isEmpty()) return result;

        // 신형: {"url":"...","name":"..."} 또는 {"url":"..."}
        if (content.contains("\"url\"")) {
            int pos = 0;
            while ((pos = content.indexOf("{\"url\"", pos)) >= 0) {
                int end = content.indexOf("}", pos) + 1;
                if (end <= pos) break;
                String obj = content.substring(pos, end);
                String url = extractJsonStringValue(obj, "url");
                if (url != null && !url.isBlank()) {
                    String name = extractJsonStringValue(obj, "name");
                    result.add(new AttachmentInfo(url, name));
                }
                pos = end;
            }
        } else {
            // 구형: "url1","url2"
            for (String part : content.split(",")) {
                String trimmed = part.trim();
                if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
                    String url = trimmed.substring(1, trimmed.length() - 1).replace("\\\"", "\"");
                    if (!url.isBlank()) result.add(new AttachmentInfo(url, null));
                }
            }
        }
        return result;
    }

    private String extractJsonStringValue(String json, String key) {
        String search = "\"" + key + "\"";
        int idx = json.indexOf(search);
        if (idx < 0) return null;
        int colon = json.indexOf(":", idx);
        int q1 = json.indexOf("\"", colon);
        if (q1 < 0) return null;
        int q2 = json.indexOf("\"", q1 + 1);
        if (q2 < 0) return null;
        return json.substring(q1 + 1, q2).replace("\\\"", "\"");
    }

    private String buildAttachmentsJson(List<AttachmentInfo> infos) {
        if (infos == null || infos.isEmpty()) {
            return "[]";
        }
        return infos.stream()
                .map(info -> {
                    String url = "\"" + info.url().replace("\"", "\\\"") + "\"";
                    if (info.originalFilename() != null && !info.originalFilename().isBlank()) {
                        String name = "\"" + info.originalFilename().replace("\"", "\\\"") + "\"";
                        return "{\"url\":" + url + ",\"name\":" + name + "}";
                    }
                    return "{\"url\":" + url + "}";
                })
                .collect(Collectors.joining(",", "[", "]"));
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

        // 메타데이터 실제 변경 여부 판단용 (댓글만 추가된 경우 등 글 수정이 없으면 버전 이력 남기지 않음)
        String origTitle = post.getTitle();
        Long origCategoryId = post.getCategoryId();
        Boolean origIsNotice = post.getIsNotice();
        String origSummaryTitle = post.getSummaryTitle();
        Integer origMaxScore = post.getMaxScore();

        // 1) title 갱신
        if (req.title() != null && !req.title().isBlank()) {
            post.changeTitle(req.title());
        }

        // 1-1) summaryTitle 갱신
        if (req.summaryTitle() != null) {
            post.changeSummaryTitle(req.summaryTitle());
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

        // 2-3) maxScore 갱신 (과제인 경우만)
        if (req.maxScore() != null && post.getPostKind() == PostKind.ASSIGNMENT) {
            post.changeMaxScore(req.maxScore());
        }

        // 수정자 정보 기록
        if (req.userId() != null) {
            post.changeUpdatedBy(req.userId());
        }
        postRepository.save(post);

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
            
            // 내용 변경 시에만 새 버전 저장
            String versionTitle = req.title() != null && !req.title().isBlank() ? req.title() : post.getTitle();
            savePostVersion(post.getId(), versionTitle, req.markdown(), true, post.getUpdatedBy());
        } else {
            // 제목/카테고리 등 메타데이터가 실제로 변경된 경우에만 버전 저장 (댓글만 추가된 PATCH는 이력 남기지 않음)
            boolean metadataActuallyChanged = (req.title() != null && !req.title().isBlank() && !req.title().trim().equals(origTitle != null ? origTitle.trim() : ""))
                    || (req.categoryId() != null && !req.categoryId().equals(origCategoryId))
                    || (req.isNotice() != null && !req.isNotice().equals(origIsNotice))
                    || (req.summaryTitle() != null && !req.summaryTitle().equals(origSummaryTitle))
                    || (req.maxScore() != null && post.getPostKind() == PostKind.ASSIGNMENT && !req.maxScore().equals(origMaxScore));
            if (metadataActuallyChanged) {
                String versionTitle = req.title() != null && !req.title().isBlank() ? req.title() : post.getTitle();
                savePostVersionForMetadataChange(post.getId(), versionTitle, post.getUpdatedBy());
            }
        }

        // 4) ASSIGNMENT인 경우 세부 실습 목록 동기화 (배점 합 = maxScore)
        if (post.getPostKind() == PostKind.ASSIGNMENT && req.tasks() != null) {
            int expectedScore = post.getMaxScore() != null && post.getMaxScore() > 0 ? post.getMaxScore() : 100;
            if (!req.tasks().isEmpty()) {
                int totalScore = req.tasks().stream().mapToInt(AssignmentTaskItemRequest::maxScore).sum();
                if (totalScore != expectedScore) {
                    throw new IllegalArgumentException("세부 실습 배점 합이 " + expectedScore + "점이어야 합니다. 현재 합: " + totalScore);
                }
            }
            List<AssignmentTask> existingTasks = assignmentTaskRepository.findByPostIdOrderBySortOrderAsc(post.getId());
            java.util.Set<Long> keptTaskIds = new java.util.HashSet<>();
            int sortOrder = 0;
            for (AssignmentTaskItemRequest t : req.tasks()) {
                String descMd = t.descriptionMarkdown() != null ? t.descriptionMarkdown() : "";
                if (t.taskId() == null) {
                    AssignmentTask task = new AssignmentTask(post.getId(), t.title(), sortOrder++, t.maxScore(), t.difficulty());
                    AssignmentTask savedTask = assignmentTaskRepository.save(task);
                    String path = storage.writeAssignmentTaskDescription(post.getId(), savedTask.getId(), descMd);
                    savedTask.changeDescriptionMdPath(path);
                    assignmentTaskRepository.save(savedTask);
                    keptTaskIds.add(savedTask.getId());
                } else {
                    AssignmentTask task = existingTasks.stream().filter(et -> et.getId().equals(t.taskId())).findFirst()
                            .orElseThrow(() -> new NotFoundException("AssignmentTask not found: " + t.taskId()));
                    task.changeTitle(t.title());
                    task.changeSortOrder(sortOrder++);
                    task.changeMaxScore(t.maxScore());
                    if (t.difficulty() != null) task.changeDifficulty(t.difficulty());
                    String path = storage.writeAssignmentTaskDescription(post.getId(), task.getId(), descMd);
                    task.changeDescriptionMdPath(path);
                    assignmentTaskRepository.save(task);
                    keptTaskIds.add(task.getId());
                }
            }
            for (AssignmentTask old : existingTasks) {
                if (!keptTaskIds.contains(old.getId())) {
                    if (old.getDescriptionMdPath() != null && !old.getDescriptionMdPath().isBlank()) {
                        storage.deleteIfExists(old.getDescriptionMdPath());
                    }
                    assignmentTaskRepository.delete(old);
                }
            }
        }

        return toResponse(post);
    }

    @Transactional
    public PostResponse addAttachments(Long id, List<MultipartFile> attachments, Long userId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Post not found: " + id));

        if (attachments == null || attachments.isEmpty()) {
            return toResponse(post);
        }

        try {
            // 새 첨부파일 저장
            List<AttachmentInfo> newInfos = attachmentStorage.saveAttachments(attachments);
            
            // 기존 첨부파일 가져오기
            List<AttachmentInfo> allInfos = parseAttachmentInfos(post.getAttachments());
            allInfos.addAll(newInfos);
            
            String attachmentsJson = buildAttachmentsJson(allInfos);
            post.changeAttachments(attachmentsJson);
            
            postRepository.save(post);
            
            // 첨부파일 변경 시에도 버전 저장
            savePostVersionForMetadataChange(post.getId(), post.getTitle(), post.getUpdatedBy());
            
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
     * 제목/첨부파일 등 메타데이터만 변경된 경우에도 버전 저장.
     * 현재 본문 내용을 읽어서 새 버전 생성.
     */
    private void savePostVersionForMetadataChange(Long postId, String title, Long userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Post not found: " + postId));
        String mdPath = post.getContentMdPath();
        String contentMd = (mdPath != null && !mdPath.isBlank())
                ? storage.read(mdPath)
                : "";
        if (contentMd == null) contentMd = "";
        savePostVersion(postId, title, contentMd, false, userId); // 메타데이터 변경은 본문 동일해도 저장
    }

    /**
     * 게시글 내용 변경 시 새 버전 저장.
     * 본문은 md 파일(posts/{postId}-{versionNumber}.md)로 저장하고, DB에는 경로만 저장.
     * @param skipIfContentSame true면 본문이 최신 버전과 동일할 때 저장 생략 (중복 방지)
     */
    private void savePostVersion(Long postId, String title, String contentMd, boolean skipIfContentSame) {
        savePostVersion(postId, title, contentMd, skipIfContentSame, null);
    }

    /**
     * 게시글 내용 변경 시 새 버전 저장 (사용자 ID 포함).
     * 본문은 md 파일(posts/{postId}-{versionNumber}.md)로 저장하고, DB에는 경로만 저장.
     * @param skipIfContentSame true면 본문이 최신 버전과 동일할 때 저장 생략 (중복 방지)
     * @param userId 변경을 일으킨 사용자 ID
     */
    private void savePostVersion(Long postId, String title, String contentMd, boolean skipIfContentSame, Long userId) {
        if (contentMd == null || contentMd.isBlank()) {
            return; // 내용이 없으면 버전 저장하지 않음
        }
        if (skipIfContentSame) {
            Optional<PostVersion> latest = postVersionRepository.findFirstByPostIdOrderByVersionNumberDesc(postId);
            if (latest.isPresent()) {
                String latestContent = readVersionContent(latest.get());
                if (contentMd.equals(latestContent)) {
                    return;
                }
            }
        }
        
        Integer nextVersionNumber = postVersionRepository.getNextVersionNumber(postId);
        String mdPath = storage.writeVersion(postId, nextVersionNumber, contentMd);
        PostVersion version = new PostVersion(postId, nextVersionNumber, title, mdPath);
        if (userId != null) {
            version.setCreatedBy(userId);
        }
        PostVersion savedVersion = postVersionRepository.save(version);
        
        // Post 엔티티의 currentVersionId 업데이트
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Post not found: " + postId));
        post.changeCurrentVersionId(savedVersion.getId());
        postRepository.save(post);
    }

    private String readVersionContent(PostVersion version) {
        String path = version.getContentMdPath();
        if (path == null || path.isBlank()) return "";
        try {
            return storage.read(path);
        } catch (Exception e) {
            log.warn("Failed to read version content from {}: {}", path, e.getMessage());
            return "";
        }
    }

    private PostVersionResponse toVersionResponse(PostVersion version) {
        String contentMd = readVersionContent(version);
        String createdByName = getUserName(version.getCreatedBy());
        return new PostVersionResponse(
                version.getId(),
                version.getPostId(),
                version.getVersionNumber(),
                version.getTitle(),
                contentMd != null ? contentMd : "",
                version.getCreatedBy(),
                createdByName,
                version.getCreatedAt()
        );
    }

    /**
     * 게시글의 모든 버전 조회 (삭제된 게시글 포함)
     */
    @Transactional(readOnly = true)
    public List<PostVersionResponse> getVersions(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Post not found: " + postId));
        
        return postVersionRepository.findByPostIdOrderByVersionNumberDesc(postId).stream()
                .map(this::toVersionResponse)
                .toList();
    }

    /**
     * 특정 버전 조회 (삭제된 게시글 포함)
     */
    @Transactional(readOnly = true)
    public PostVersionResponse getVersion(Long postId, Integer versionNumber) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Post not found: " + postId));
        
        PostVersion version = postVersionRepository.findByPostIdAndVersionNumber(postId, versionNumber)
                .orElseThrow(() -> new NotFoundException("Version not found: postId=" + postId + ", versionNumber=" + versionNumber));
        return toVersionResponse(version);
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
     * 전체 변경 이력 조회 (생성, 수정, 삭제 통합). 페이징 및 검색 지원.
     */
    @Transactional(readOnly = true)
    public PageResponse<com.fasoo.cs_doc.post.dto.ChangeHistoryItem> getAllChangeHistory(Pageable pageable, String changeType, String keyword, Long postId) {
        List<com.fasoo.cs_doc.post.dto.ChangeHistoryItem> history = new ArrayList<>();
        
        // 1. 모든 버전 조회 (생성/수정 이력)
        List<PostVersion> allVersions = postVersionRepository.findAllByOrderByCreatedAtDesc();
        
        Map<Long, Post> postCache = new HashMap<>();
        for (PostVersion version : allVersions) {
            Post post = postCache.computeIfAbsent(version.getPostId(), id -> 
                postRepository.findById(id).orElse(null)
            );
            
            if (post == null) continue;
            
            PostListItemResponse postItem = toListItem(post);
            String type = version.getVersionNumber() == 1 ? "생성" : "수정";
            String changedByName = getUserName(version.getCreatedBy());
            
            if (changeType == null || changeType.equals(type)) {
                String versionTitle = version.getTitle();
                if (type.equals("생성")) {
                    history.add(com.fasoo.cs_doc.post.dto.ChangeHistoryItem.create(
                            postItem, version.getVersionNumber(), version.getCreatedAt(), versionTitle, changedByName
                    ));
                } else {
                    history.add(com.fasoo.cs_doc.post.dto.ChangeHistoryItem.update(
                            postItem, version.getVersionNumber(), version.getCreatedAt(), versionTitle, changedByName
                    ));
                }
            }
        }
        
        // 2. 삭제 이력 추가
        if (changeType == null || changeType.equals("삭제")) {
            List<Post> deletedPosts = postRepository.findByDeletedTrueOrderByUpdatedAtDesc();
            for (Post deletedPost : deletedPosts) {
                PostListItemResponse postItem = toListItem(deletedPost);
                String deletedByName = getUserName(deletedPost.getUpdatedBy());
                history.add(com.fasoo.cs_doc.post.dto.ChangeHistoryItem.delete(postItem, deletedByName));
            }
        }
        
        // 변경일 기준 내림차순 정렬
        history.sort((a, b) -> b.changeDate().compareTo(a.changeDate()));
        
        // 검색 필터 적용
        if (postId != null) {
            history = history.stream().filter(h -> postId.equals(h.postId())).toList();
        } else if (keyword != null && !keyword.trim().isEmpty()) {
            String kw = keyword.trim().toLowerCase();
            history = history.stream()
                    .filter(h -> h.postTitle() != null && h.postTitle().toLowerCase().contains(kw))
                    .toList();
        }
        
        // 페이징 적용
        int page = pageable.getPageNumber();
        int size = pageable.getPageSize();
        int total = history.size();
        int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 0;
        int start = Math.min(page * size, total);
        int end = Math.min(start + size, total);
        List<com.fasoo.cs_doc.post.dto.ChangeHistoryItem> paged = start < total ? history.subList(start, end) : List.of();
        
        return PageResponse.of(paged, page, size, (long) total, totalPages, page < totalPages - 1, page > 0);
    }

    /**
     * 게시글 삭제 (soft delete)
     * 삭제된 게시글은 목록에서 보이지 않지만 데이터베이스에는 유지되어 추후 복구 가능합니다.
     */
    @Transactional
    public void delete(Long id, Long userId) {
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
