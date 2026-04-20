package com.fasoo.cs_doc.memo.service;

import com.fasoo.cs_doc.global.exception.NotFoundException;
import com.fasoo.cs_doc.global.page.PageResponse;
import com.fasoo.cs_doc.member.repository.MemberRepository;
import com.fasoo.cs_doc.memo.domain.Memo;
import com.fasoo.cs_doc.memo.dto.*;
import com.fasoo.cs_doc.memo.repository.MemoRepository;
import com.fasoo.cs_doc.post.service.AttachmentInfo;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MemoService {

    private static final int BODY_PREVIEW_LENGTH = 120;
    private static final int MAX_IMAGES = 10;

    private final MemoRepository memoRepository;
    private final MemberRepository memberRepository;

    public MemoService(MemoRepository memoRepository, MemberRepository memberRepository) {
        this.memoRepository = memoRepository;
        this.memberRepository = memberRepository;
    }

    private String getUserName(Long userId) {
        if (userId == null) return null;
        return memberRepository.findById(userId)
                .map(m -> m.getName())
                .orElse(null);
    }

    /** 이미지 JSON에서 항목 개수 확인 (최대 10개) */
    private void validateImagesCount(String imagesJson) {
        if (imagesJson == null || imagesJson.isBlank() || "[]".equals(imagesJson.trim())) {
            return;
        }
        List<AttachmentInfo> infos = parseImageInfos(imagesJson);
        if (infos.size() > MAX_IMAGES) {
            throw new IllegalArgumentException("images must be at most " + MAX_IMAGES);
        }
    }

    /** JPQL/SQL LIKE 와일드카드·이스케이프 문자를 리터럴로만 취급 (DB별 Criteria escape 처리) */
    private static String escapeLike(String raw) {
        if (raw == null || raw.isEmpty()) return "";
        return raw.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private Specification<Memo> keywordSpec(String keywordTrimmed) {
        String pattern = "%" + escapeLike(keywordTrimmed) + "%";
        return (root, query, cb) -> {
            Expression<String> title = root.get("title");
            Expression<String> body = root.get("body");
            Predicate titleMatch = cb.like(cb.lower(title), pattern.toLowerCase(), '\\');
            Predicate bodyMatch = cb.like(body, pattern, '\\');
            return cb.or(titleMatch, bodyMatch);
        };
    }

    private List<AttachmentInfo> parseImageInfos(String json) {
        if (json == null || json.isBlank() || !json.trim().startsWith("[")) {
            return new ArrayList<>();
        }
        List<AttachmentInfo> result = new ArrayList<>();
        String content = json.trim();
        if (content.length() <= 2) return result;
        content = content.substring(1, content.endsWith("]") ? content.length() - 1 : content.length()).trim();
        if (content.isEmpty()) return result;
        Pattern urlPattern = Pattern.compile("\"url\"\\s*:\\s*\"([^\"]*)\"");
        Matcher m = urlPattern.matcher(content);
        while (m.find()) {
            String url = m.group(1);
            if (url != null && !url.isBlank()) {
                result.add(new AttachmentInfo(url, null));
            }
        }
        return result;
    }

    @Transactional
    public MemoResponse create(MemoCreateRequest req) {
        validateImagesCount(req.images());
        Memo memo = new Memo(
                req.title().trim(),
                req.body() != null ? req.body() : "",
                req.images()
        );
        if (req.userId() != null) {
            memo.changeCreatedBy(req.userId());
            memo.changeUpdatedBy(req.userId());
        }
        Memo saved = memoRepository.save(memo);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public MemoResponse getById(Long id) {
        Memo memo = memoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Memo not found: " + id));
        return toResponse(memo);
    }

    @Transactional(readOnly = true)
    public PageResponse<MemoListItemResponse> list(String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<Memo> pageResult;
        long total;
        if (keyword != null && !keyword.trim().isEmpty()) {
            String kw = keyword.trim();
            pageResult = memoRepository.findAll(keywordSpec(kw), pageable);
            total = pageResult.getTotalElements();
        } else {
            pageResult = memoRepository.findAllBy(pageable);
            total = pageResult.getTotalElements();
        }
        List<MemoListItemResponse> items = pageResult.getContent().stream()
                .map(this::toListItem)
                .toList();
        int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 0;
        return PageResponse.of(
                items,
                page,
                size,
                total,
                totalPages,
                page < totalPages - 1,
                page > 0
        );
    }

    @Transactional
    public MemoResponse update(Long id, MemoUpdateRequest req) {
        Memo memo = memoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Memo not found: " + id));
        if (req.title() != null && !req.title().isBlank()) {
            memo.changeTitle(req.title().trim());
        }
        if (req.body() != null) {
            memo.changeBody(req.body());
        }
        if (req.images() != null) {
            validateImagesCount(req.images());
            memo.changeImages(req.images());
        }
        if (req.userId() != null) {
            memo.changeUpdatedBy(req.userId());
        }
        return toResponse(memoRepository.save(memo));
    }

    @Transactional
    public void delete(Long id) {
        Memo memo = memoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Memo not found: " + id));
        memoRepository.delete(memo);
    }

    private String bodyPreview(String body) {
        if (body == null || body.isEmpty()) return "";
        String s = body.replace("\r\n", " ").replace("\n", " ").trim();
        if (s.length() <= BODY_PREVIEW_LENGTH) return s;
        return s.substring(0, BODY_PREVIEW_LENGTH) + "...";
    }

    private MemoListItemResponse toListItem(Memo m) {
        String updatedByName = getUserName(m.getUpdatedBy());
        return new MemoListItemResponse(
                m.getId(),
                m.getTitle(),
                bodyPreview(m.getBody()),
                m.getCreatedAt(),
                m.getUpdatedAt(),
                updatedByName
        );
    }

    private MemoResponse toResponse(Memo m) {
        String updatedByName = getUserName(m.getUpdatedBy());
        return new MemoResponse(
                m.getId(),
                m.getTitle(),
                m.getBody(),
                m.getImages(),
                m.getCreatedAt(),
                m.getUpdatedAt(),
                updatedByName
        );
    }
}
