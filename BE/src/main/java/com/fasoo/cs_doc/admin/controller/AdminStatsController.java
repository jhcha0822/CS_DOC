package com.fasoo.cs_doc.admin.controller;

import com.fasoo.cs_doc.admin.dto.AdminContentStatsResponse;
import com.fasoo.cs_doc.admin.dto.PostStatListItem;
import com.fasoo.cs_doc.admin.service.AdminStatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Admin Stats", description = "관리자 통계·현황")
@RestController
@RequestMapping("/api/admin")
public class AdminStatsController {

    private final AdminStatsService adminStatsService;

    public AdminStatsController(AdminStatsService adminStatsService) {
        this.adminStatsService = adminStatsService;
    }

    @Operation(summary = "카테고리별 게시글 수·기간별 등록 수·메모 수 (관리자 전용)")
    @GetMapping("/content-stats")
    public AdminContentStatsResponse contentStats(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end
    ) {
        return adminStatsService.getContentStats(userId, start, end);
    }

    @Operation(summary = "통계 화면용: 카테고리(또는 미지정)에 속한 게시글 목록 (최대 500건, 관리자 전용)")
    @GetMapping("/content-stats/posts")
    public List<PostStatListItem> contentStatsPosts(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(required = false, defaultValue = "false") boolean uncategorized,
            @RequestParam(required = false) List<Long> categoryIds,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end
    ) {
        return adminStatsService.listPostsForStats(userId, uncategorized, categoryIds, start, end);
    }
}
