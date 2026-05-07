package com.fasoo.cs_doc.admin.service;

import com.fasoo.cs_doc.admin.dto.AdminContentStatsResponse;
import com.fasoo.cs_doc.admin.dto.CategoryPostCountDto;
import com.fasoo.cs_doc.admin.dto.MemoStatListItem;
import com.fasoo.cs_doc.admin.dto.PostStatListItem;
import com.fasoo.cs_doc.category.domain.Category;
import com.fasoo.cs_doc.category.repository.CategoryRepository;
import com.fasoo.cs_doc.member.domain.UserRole;
import com.fasoo.cs_doc.member.repository.MemberRepository;
import com.fasoo.cs_doc.memo.domain.DeletedMemo;
import com.fasoo.cs_doc.memo.domain.Memo;
import com.fasoo.cs_doc.memo.repository.DeletedMemoRepository;
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
import java.util.stream.Stream;

@Service
public class AdminStatsService {

    private static final int POST_LIST_CAP = 500;

    private final MemberRepository memberRepository;
    private final CategoryRepository categoryRepository;
    private final PostRepository postRepository;
    private final MemoRepository memoRepository;
    private final DeletedMemoRepository deletedMemoRepository;

    public AdminStatsService(
            MemberRepository memberRepository,
            CategoryRepository categoryRepository,
            PostRepository postRepository,
            MemoRepository memoRepository,
            DeletedMemoRepository deletedMemoRepository
    ) {
        this.memberRepository = memberRepository;
        this.categoryRepository = categoryRepository;
        this.postRepository = postRepository;
        this.memoRepository = memoRepository;
        this.deletedMemoRepository = deletedMemoRepository;
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

            long parentCumulative = postRepository.countByDeletedFalseAndCategoryIdIn(subtreeIds);
            Long parentCreated = null;
            Long parentDeleted = null;
            Long parentNet = null;
            if (dateFilter) {
                parentCreated = postRepository.countByCategoryIdInAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                        subtreeIds, rangeStart, rangeEndExclusive);
                parentDeleted = postRepository.countByDeletedTrueAndCategoryIdInAndUpdatedAtGreaterThanEqualAndUpdatedAtLessThan(
                        subtreeIds, rangeStart, rangeEndExclusive);
                parentNet = parentCreated - parentDeleted;
            }
            rows.add(new CategoryPostCountDto(
                    parent.getId(),
                    null,
                    0,
                    parent.getLabel(),
                    parentCumulative,
                    parentCreated,
                    parentDeleted,
                    parentNet,
                    List.copyOf(subtreeIds)
            ));

            List<Category> children = all.stream()
                    .filter(c -> c.getDepth() == 1 && parent.getId().equals(c.getParentId()))
                    .sorted(Comparator.comparingInt(Category::getSortOrder))
                    .collect(Collectors.toList());
            for (Category child : children) {
                List<Long> childIds = List.of(child.getId());
                long childCumulative = postRepository.countByDeletedFalseAndCategoryIdIn(childIds);
                Long childCreated = null;
                Long childDeleted = null;
                Long childNet = null;
                if (dateFilter) {
                    childCreated = postRepository.countByCategoryIdInAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                            childIds, rangeStart, rangeEndExclusive);
                    childDeleted = postRepository.countByDeletedTrueAndCategoryIdInAndUpdatedAtGreaterThanEqualAndUpdatedAtLessThan(
                            childIds, rangeStart, rangeEndExclusive);
                    childNet = childCreated - childDeleted;
                }
                rows.add(new CategoryPostCountDto(
                        child.getId(),
                        parent.getId(),
                        1,
                        child.getLabel(),
                        childCumulative,
                        childCreated,
                        childDeleted,
                        childNet,
                        childIds
                ));
            }
        }

        long uncategorizedCumulative = postRepository.countByDeletedFalseAndCategoryIdIsNull();
        Long uncCreated = null;
        Long uncDeleted = null;
        Long uncNet = null;
        if (dateFilter) {
            uncCreated = postRepository.countByCategoryIdIsNullAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                    rangeStart, rangeEndExclusive);
            uncDeleted = postRepository.countByDeletedTrueAndCategoryIdIsNullAndUpdatedAtGreaterThanEqualAndUpdatedAtLessThan(
                    rangeStart, rangeEndExclusive);
            uncNet = uncCreated - uncDeleted;
        }

        long memoCumulative = memoRepository.count();
        Long memoCreated = null;
        Long memoDeleted = null;
        Long memoNet = null;
        if (dateFilter) {
            memoCreated = memoRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(rangeStart, rangeEndExclusive);
            memoDeleted = deletedMemoRepository.countByDeletedAtGreaterThanEqualAndDeletedAtLessThan(
                    rangeStart, rangeEndExclusive);
            memoNet = memoCreated - memoDeleted;
        }

        long totalCumulative = postRepository.countByDeletedFalse();
        Long totalCreated = null;
        Long totalDeleted = null;
        Long totalNet = null;
        if (dateFilter) {
            totalCreated = postRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(rangeStart, rangeEndExclusive);
            totalDeleted = postRepository.countByDeletedTrueAndUpdatedAtGreaterThanEqualAndUpdatedAtLessThan(
                    rangeStart, rangeEndExclusive);
            totalNet = totalCreated - totalDeleted;
        }

        return new AdminContentStatsResponse(
                totalCumulative,
                totalCreated,
                totalDeleted,
                totalNet,
                rows,
                uncategorizedCumulative,
                uncCreated,
                uncDeleted,
                uncNet,
                memoCumulative,
                memoCreated,
                memoDeleted,
                memoNet,
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
                    ? postRepository.findByCategoryIdIsNullAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                            rangeStart, rangeEndExclusive, pageable)
                    : postRepository.findByCategoryIdIsNull(pageable);
        } else {
            page = dateFilter
                    ? postRepository.findByCategoryIdInAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                            categoryIds, rangeStart, rangeEndExclusive, pageable)
                    : postRepository.findByCategoryIdIn(categoryIds, pageable);
        }

        Map<Long, String> labelById = categoryRepository.findAllByOrderBySortOrderAsc().stream()
                .collect(Collectors.toMap(Category::getId, Category::getLabel, (a, b) -> a));

        return page.getContent().stream()
                .map(p -> new PostStatListItem(
                        p.getId(),
                        p.getTitle(),
                        p.getCreatedAt(),
                        p.getCategoryId(),
                        p.getCategoryId() != null ? labelById.getOrDefault(p.getCategoryId(), "—") : "카테고리 미지정",
                        Boolean.TRUE.equals(p.getDeleted()),
                        p.getDeletionReason()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MemoStatListItem> listMemosForStats(Long userId, LocalDate start, LocalDate end) {
        requireAdmin(userId);
        boolean dateFilter = start != null && end != null;
        if (dateFilter && end.isBefore(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "종료일은 시작일 이후여야 합니다.");
        }

        if (!dateFilter) {
            Pageable pageable = PageRequest.of(0, POST_LIST_CAP, Sort.by(Sort.Direction.DESC, "updatedAt"));
            return memoRepository.findAllBy(pageable).getContent().stream()
                    .map(m -> new MemoStatListItem(
                            "m:" + m.getId(),
                            m.getId(),
                            m.getTitle(),
                            m.getCreatedAt(),
                            false,
                            null,
                            null
                    ))
                    .toList();
        }

        LocalDateTime rangeStart = start.atStartOfDay();
        LocalDateTime rangeEndExclusive = end.plusDays(1).atStartOfDay();
        Pageable byCreated = PageRequest.of(0, POST_LIST_CAP, Sort.by(Sort.Direction.DESC, "createdAt"));
        Pageable byDeleted = PageRequest.of(0, POST_LIST_CAP, Sort.by(Sort.Direction.DESC, "deletedAt"));

        List<Memo> createdInPeriod = memoRepository
                .pageCreatedInPeriod(rangeStart, rangeEndExclusive, byCreated)
                .getContent();
        List<DeletedMemo> deletedInPeriod = deletedMemoRepository
                .pageDeletedInPeriod(rangeStart, rangeEndExclusive, byDeleted)
                .getContent();

        List<MemoStatListItem> activeItems = createdInPeriod.stream()
                .map(m -> new MemoStatListItem(
                        "m:" + m.getId(),
                        m.getId(),
                        m.getTitle(),
                        m.getCreatedAt(),
                        false,
                        null,
                        null
                ))
                .toList();
        List<MemoStatListItem> deletedItems = deletedInPeriod.stream()
                .map(d -> new MemoStatListItem(
                        "d:" + d.getId(),
                        d.getSourceMemoId(),
                        d.getTitle(),
                        d.getOriginalCreatedAt(),
                        true,
                        d.getDeletedAt(),
                        d.getDeletionReason()
                ))
                .toList();

        return Stream.concat(activeItems.stream(), deletedItems.stream())
                .sorted(Comparator.comparing(
                        (MemoStatListItem x) -> x.deleted() ? x.deletedAt() : x.createdAt(),
                        Comparator.nullsLast(Comparator.naturalOrder())
                ).reversed())
                .limit(POST_LIST_CAP)
                .toList();
    }

}
