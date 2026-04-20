package com.fasoo.cs_doc.admin.service;

import com.fasoo.cs_doc.admin.dto.AdminContentStatsResponse;
import com.fasoo.cs_doc.admin.dto.CategoryPostCountDto;
import com.fasoo.cs_doc.admin.dto.PostStatListItem;
import com.fasoo.cs_doc.category.domain.Category;
import com.fasoo.cs_doc.category.repository.CategoryRepository;
import com.fasoo.cs_doc.member.domain.UserRole;
import com.fasoo.cs_doc.member.repository.MemberRepository;
import com.fasoo.cs_doc.memo.repository.MemoRepository;
import com.fasoo.cs_doc.post.domain.Post;
import com.fasoo.cs_doc.post.repository.PostRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminStatsService {

    private static final int POST_LIST_CAP = 500;

    private final MemberRepository memberRepository;
    private final CategoryRepository categoryRepository;
    private final PostRepository postRepository;
    private final MemoRepository memoRepository;

    public AdminStatsService(
            MemberRepository memberRepository,
            CategoryRepository categoryRepository,
            PostRepository postRepository,
            MemoRepository memoRepository
    ) {
        this.memberRepository = memberRepository;
        this.categoryRepository = categoryRepository;
        this.postRepository = postRepository;
        this.memoRepository = memoRepository;
    }

    private void requireAdmin(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        boolean admin = memberRepository.findById(userId)
                .map(m -> m.getRole() == UserRole.ADMIN)
                .orElse(false);
        if (!admin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 조회할 수 있습니다.");
        }
    }

    @Transactional(readOnly = true)
    public AdminContentStatsResponse getContentStats(Long userId, LocalDate start, LocalDate end) {
        requireAdmin(userId);

        boolean dateFilter = start != null && end != null;
        if (dateFilter && end.isBefore(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "종료일은 시작일 이후여야 합니다.");
        }

        LocalDateTime rangeStart = dateFilter ? start.atStartOfDay() : null;
        LocalDateTime rangeEndExclusive = dateFilter ? end.plusDays(1).atStartOfDay() : null;

        List<Category> all = categoryRepository.findAllByOrderBySortOrderAsc();
        List<Category> roots = all.stream()
                .filter(c -> c.getDepth() == 0)
                .sorted(Comparator.comparingInt(Category::getSortOrder))
                .collect(Collectors.toList());

        List<CategoryPostCountDto> rows = new ArrayList<>();

        for (Category parent : roots) {
            List<Long> subtreeIds = new ArrayList<>();
            subtreeIds.add(parent.getId());
            all.stream()
                    .filter(c -> c.getDepth() == 1 && parent.getId().equals(c.getParentId()))
                    .sorted(Comparator.comparingInt(Category::getSortOrder))
                    .forEach(c -> subtreeIds.add(c.getId()));

            long parentTreeCount = countPostsInCategories(subtreeIds, dateFilter, rangeStart, rangeEndExclusive);
            rows.add(new CategoryPostCountDto(
                    parent.getId(),
                    null,
                    0,
                    parent.getLabel(),
                    parentTreeCount,
                    List.copyOf(subtreeIds)
            ));

            List<Category> children = all.stream()
                    .filter(c -> c.getDepth() == 1 && parent.getId().equals(c.getParentId()))
                    .sorted(Comparator.comparingInt(Category::getSortOrder))
                    .collect(Collectors.toList());
            for (Category child : children) {
                List<Long> childIds = List.of(child.getId());
                long childCount = countPostsInCategories(childIds, dateFilter, rangeStart, rangeEndExclusive);
                rows.add(new CategoryPostCountDto(
                        child.getId(),
                        parent.getId(),
                        1,
                        child.getLabel(),
                        childCount,
                        childIds
                ));
            }
        }

        long uncategorized = dateFilter
                ? postRepository.countByDeletedFalseAndCategoryIdIsNullAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                        rangeStart, rangeEndExclusive)
                : postRepository.countByDeletedFalseAndCategoryIdIsNull();

        long memoCnt = dateFilter
                ? memoRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(rangeStart, rangeEndExclusive)
                : memoRepository.count();

        long totalPostCount = dateFilter
                ? postRepository.countByDeletedFalseAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                        rangeStart, rangeEndExclusive)
                : postRepository.countByDeletedFalse();

        return new AdminContentStatsResponse(
                totalPostCount,
                rows,
                uncategorized,
                memoCnt,
                dateFilter ? start : null,
                dateFilter ? end : null,
                dateFilter
        );
    }

    @Transactional(readOnly = true)
    public List<PostStatListItem> listPostsForStats(
            Long userId,
            boolean uncategorized,
            List<Long> categoryIds,
            LocalDate start,
            LocalDate end
    ) {
        requireAdmin(userId);
        boolean dateFilter = start != null && end != null;
        if (dateFilter && end.isBefore(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "종료일은 시작일 이후여야 합니다.");
        }
        if (!uncategorized && (categoryIds == null || categoryIds.isEmpty())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "categoryIds가 필요합니다.");
        }
        if (uncategorized && categoryIds != null && !categoryIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "uncategorized 여부와 categoryIds는 함께 사용할 수 없습니다.");
        }

        LocalDateTime rangeStart = dateFilter ? start.atStartOfDay() : null;
        LocalDateTime rangeEndExclusive = dateFilter ? end.plusDays(1).atStartOfDay() : null;
        Pageable pageable = PageRequest.of(0, POST_LIST_CAP, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Post> page;
        if (uncategorized) {
            page = dateFilter
                    ? postRepository.findByDeletedFalseAndCategoryIdIsNullAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                            rangeStart, rangeEndExclusive, pageable)
                    : postRepository.findByDeletedFalseAndCategoryIdIsNull(pageable);
        } else {
            page = dateFilter
                    ? postRepository.findByDeletedFalseAndCategoryIdInAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                            categoryIds, rangeStart, rangeEndExclusive, pageable)
                    : postRepository.findByDeletedFalseAndCategoryIdIn(categoryIds, pageable);
        }

        Map<Long, String> labelById = categoryRepository.findAllByOrderBySortOrderAsc().stream()
                .collect(Collectors.toMap(Category::getId, Category::getLabel, (a, b) -> a));

        return page.getContent().stream()
                .map(p -> new PostStatListItem(
                        p.getId(),
                        p.getTitle(),
                        p.getCreatedAt(),
                        p.getCategoryId(),
                        p.getCategoryId() != null ? labelById.getOrDefault(p.getCategoryId(), "—") : "카테고리 미지정"
                ))
                .toList();
    }

    private long countPostsInCategories(
            List<Long> categoryIds,
            boolean dateFilter,
            LocalDateTime rangeStart,
            LocalDateTime rangeEndExclusive
    ) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return 0;
        }
        if (dateFilter) {
            return postRepository.countByDeletedFalseAndCategoryIdInAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                    categoryIds, rangeStart, rangeEndExclusive);
        }
        return postRepository.countByDeletedFalseAndCategoryIdIn(categoryIds);
    }
}
