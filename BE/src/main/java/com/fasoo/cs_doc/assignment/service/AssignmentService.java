package com.fasoo.cs_doc.assignment.service;

import com.fasoo.cs_doc.assignment.domain.*;
import com.fasoo.cs_doc.assignment.dto.AdminAssignmentGradesDto;
import com.fasoo.cs_doc.assignment.dto.AssignmentPageResponse;
import com.fasoo.cs_doc.assignment.dto.TaskScoreItem;
import com.fasoo.cs_doc.assignment.domain.AdminGradingNotification;
import com.fasoo.cs_doc.assignment.repository.*;
import com.fasoo.cs_doc.assignment.domain.SubmissionStatus;
import com.fasoo.cs_doc.assignment.domain.UserGradedNotification;
import com.fasoo.cs_doc.category.repository.CategoryRepository;
import com.fasoo.cs_doc.global.exception.NotFoundException;
import com.fasoo.cs_doc.member.repository.MemberRepository;
import com.fasoo.cs_doc.post.domain.Post;
import com.fasoo.cs_doc.post.domain.PostKind;
import com.fasoo.cs_doc.post.repository.PostRepository;
import com.fasoo.cs_doc.post.service.AttachmentInfo;
import com.fasoo.cs_doc.post.service.AttachmentStorage;
import com.fasoo.cs_doc.post.service.PostContentStorage;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.HashSet;

import com.fasoo.cs_doc.member.domain.Member;
import com.fasoo.cs_doc.member.domain.UserRole;

/**
 * 실습(과제) 서비스: Post(ASSIGNMENT) - Submission(제출) - Review(평가).
 * 피평가자/평가자 표시를 위해 MemberSummary(submitterSummary, reviewerSummary) 제공.
 */
@Service
public class AssignmentService {

    private final PostRepository postRepository;
    private final CategoryRepository categoryRepository;
    private final AssignmentTaskRepository assignmentTaskRepository;
    private final AssignmentTaskSubmissionRepository assignmentTaskSubmissionRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final AssignmentReviewRepository reviewRepository;
    private final AssignmentTaskReviewRepository taskReviewRepository;
    private final AssignmentRequestRepository assignmentRequestRepository;
    private final AdminGradingNotificationRepository adminGradingNotificationRepository;
    private final UserGradedNotificationRepository userGradedNotificationRepository;
    private final PostContentStorage storage;
    private final AttachmentStorage attachmentStorage;
    private final MemberRepository memberRepository;

    public AssignmentService(PostRepository postRepository,
                             CategoryRepository categoryRepository,
                             AssignmentTaskRepository assignmentTaskRepository,
                             AssignmentTaskSubmissionRepository assignmentTaskSubmissionRepository,
                             AssignmentSubmissionRepository submissionRepository,
                             AssignmentReviewRepository reviewRepository,
                             AssignmentTaskReviewRepository taskReviewRepository,
                             AssignmentRequestRepository assignmentRequestRepository,
                             AdminGradingNotificationRepository adminGradingNotificationRepository,
                             UserGradedNotificationRepository userGradedNotificationRepository,
                             PostContentStorage storage,
                             AttachmentStorage attachmentStorage,
                             MemberRepository memberRepository) {
        this.postRepository = postRepository;
        this.categoryRepository = categoryRepository;
        this.assignmentTaskRepository = assignmentTaskRepository;
        this.assignmentTaskSubmissionRepository = assignmentTaskSubmissionRepository;
        this.submissionRepository = submissionRepository;
        this.reviewRepository = reviewRepository;
        this.taskReviewRepository = taskReviewRepository;
        this.assignmentRequestRepository = assignmentRequestRepository;
        this.adminGradingNotificationRepository = adminGradingNotificationRepository;
        this.userGradedNotificationRepository = userGradedNotificationRepository;
        this.storage = storage;
        this.attachmentStorage = attachmentStorage;
        this.memberRepository = memberRepository;
    }

    @Transactional(readOnly = true)
    public AssignmentPageResponse getAssignmentPage(Long postId, Long userId) {
        Post post = requireAssignmentPost(postId);

        String categoryLabel = categoryRepository.findById(post.getCategoryId())
                .map(c -> c.getLabel())
                .orElse(null);
        String problemMarkdown = post.getContentMdPath() != null && !post.getContentMdPath().isBlank()
                ? storage.readOptional(post.getContentMdPath())
                : "";
        List<AssignmentTask> tasks = assignmentTaskRepository.findByPostIdOrderBySortOrderAsc(post.getId());
        List<AssignmentPageResponse.TaskItem> taskItems = new ArrayList<>();
        for (AssignmentTask task : tasks) {
            String descMd = task.getDescriptionMdPath() != null && !task.getDescriptionMdPath().isBlank()
                    ? storage.readOptional(task.getDescriptionMdPath()) : "";
            taskItems.add(new AssignmentPageResponse.TaskItem(
                    task.getId(),
                    task.getTitle(),
                    descMd,
                    task.getSortOrder(),
                    task.getMaxScore(),
                    task.getDifficulty() != null ? task.getDifficulty() : "MEDIUM"
            ));
        }

        // 현재 사용자의 답변
        AssignmentPageResponse.MySubmissionItem mySubmission = null;
        if (userId != null) {
            Optional<AssignmentSubmission> subOpt = submissionRepository.findByPostIdAndSubmitterId(postId, userId);
            if (subOpt.isPresent()) {
                AssignmentSubmission sub = subOpt.get();
                String answerMd = sub.getAnswerMdPath() != null ? storage.readOptional(sub.getAnswerMdPath()) : "";
                List<AssignmentPageResponse.TaskAnswerItem> taskAnswerItems = new ArrayList<>();
                for (AssignmentTask task : tasks) {
                    String taskMd = assignmentTaskSubmissionRepository.findBySubmissionIdAndTaskId(sub.getId(), task.getId())
                            .map(ts -> ts.getAnswerMdPath() != null ? storage.readOptional(ts.getAnswerMdPath()) : "")
                            .orElse("");
                    taskAnswerItems.add(new AssignmentPageResponse.TaskAnswerItem(task.getId(), taskMd));
                }
                Optional<AssignmentReview> reviewOpt = reviewRepository.findBySubmissionId(sub.getId());
                AssignmentPageResponse.ReviewItem reviewItem = reviewOpt.map(r -> toReviewItem(r, sub.getId(), tasks)).orElse(null);

                mySubmission = new AssignmentPageResponse.MySubmissionItem(
                        sub.getId(),
                        sub.getStatus().name(),
                        answerMd,
                        taskAnswerItems,
                        sub.getAttachments(),
                        sub.getSubmittedAt(),
                        sub.getGradedAt(),
                        reviewItem
                );
            }
        }

        // 모든 답변 목록 (관리자 또는 작성자만 볼 수 있음)
        List<AssignmentPageResponse.SubmissionItem> allSubmissions = new ArrayList<>();
        boolean canViewAll = userId != null && (
                post.getCreatedBy() != null && post.getCreatedBy().equals(userId) ||
                memberRepository.findById(userId).map(m -> "ADMIN".equals(m.getRole())).orElse(false)
        );
        if (canViewAll) {
            List<AssignmentSubmission> submissions = submissionRepository.findByPostId(postId);
            List<Long> submissionIds = submissions.stream().map(AssignmentSubmission::getId).toList();
            List<AssignmentReview> reviews = submissionIds.isEmpty() ? List.of()
                    : reviewRepository.findBySubmissionIdIn(submissionIds);

            for (AssignmentSubmission sub : submissions) {
                String answerMd = sub.getAnswerMdPath() != null ? storage.readOptional(sub.getAnswerMdPath()) : "";
                List<AssignmentPageResponse.TaskAnswerItem> taskAnswerItems = new ArrayList<>();
                if (!tasks.isEmpty()) {
                    for (AssignmentTask task : tasks) {
                        String taskMd = assignmentTaskSubmissionRepository.findBySubmissionIdAndTaskId(sub.getId(), task.getId())
                                .map(ts -> ts.getAnswerMdPath() != null ? storage.readOptional(ts.getAnswerMdPath()) : "")
                                .orElse("");
                        taskAnswerItems.add(new AssignmentPageResponse.TaskAnswerItem(task.getId(), taskMd));
                    }
                }
                AssignmentReview review = reviews.stream()
                        .filter(r -> r.getSubmissionId().equals(sub.getId()))
                        .findFirst()
                        .orElse(null);
                AssignmentPageResponse.MemberSummary submitterSummary = toMemberSummary(sub.getSubmitterId());

                allSubmissions.add(new AssignmentPageResponse.SubmissionItem(
                        sub.getId(),
                        sub.getSubmitterId(),
                        submitterSummary != null ? submitterSummary.name() : null,
                        submitterSummary,
                        sub.getStatus().name(),
                        answerMd,
                        taskAnswerItems,
                        sub.getAttachments(),
                        sub.getSubmittedAt(),
                        sub.getGradedAt(),
                        review != null ? toReviewItem(review, sub.getId(), tasks) : null
                ));
            }
        }

        String createdByName = post.getCreatedBy() != null
                ? memberRepository.findById(post.getCreatedBy()).map(m -> m.getName()).orElse(null)
                : null;

        return new AssignmentPageResponse(
                post.getId(),
                post.getTitle(),
                post.getSummaryTitle(),
                post.getCategoryId(),
                categoryLabel,
                post.getCreatedBy(),
                createdByName,
                post.getCreatedAt(),
                post.getUpdatedAt(),
                post.getDueAt(),
                post.getMaxScore(),
                problemMarkdown,
                post.getAttachments(),
                taskItems,
                mySubmission,
                allSubmissions
        );
    }

    // --- 사용자 제출 ---

    @Transactional
    public AssignmentSubmission getOrCreateMySubmission(Long postId, Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId required");
        }
        requireAssignmentPost(postId);
        return submissionRepository.findByPostIdAndSubmitterId(postId, userId)
                .orElseGet(() -> {
                    AssignmentSubmission sub = new AssignmentSubmission(postId, userId);
                    return submissionRepository.save(sub);
                });
    }

    @Transactional
    public void putSubmissionAnswer(Long submissionId, Long userId, Long taskId, String markdown) {
        AssignmentSubmission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new NotFoundException("Submission not found: " + submissionId));
        if (!sub.getSubmitterId().equals(userId)) {
            throw new IllegalArgumentException("Not your submission");
        }
        // 평가 완료 전까지 수정 가능 (DRAFT, SUBMITTED)
        if (sub.getStatus() == SubmissionStatus.GRADED) {
            throw new IllegalStateException("Cannot edit after grading");
        }
        String md = markdown != null ? markdown : "";
        if (taskId != null) {
            // 세부 실습별 답변 저장
            AssignmentTask task = assignmentTaskRepository.findById(taskId)
                    .orElseThrow(() -> new NotFoundException("Task not found: " + taskId));
            if (!java.util.Objects.equals(task.getPostId(), sub.getPostId())) {
                throw new IllegalArgumentException("Task does not belong to this assignment");
            }
            AssignmentTaskSubmission taskSub = assignmentTaskSubmissionRepository
                    .findBySubmissionIdAndTaskId(submissionId, taskId)
                    .orElseGet(() -> {
                        AssignmentTaskSubmission ts = new AssignmentTaskSubmission(submissionId, taskId);
                        return assignmentTaskSubmissionRepository.save(ts);
                    });
            String path = storage.writeAssignmentAnswer(sub.getPostId(), sub.getSubmitterId(), taskId, md);
            taskSub.setAnswerMdPath(path);
            assignmentTaskSubmissionRepository.save(taskSub);
        } else {
            // 통합 답변 (tasks 없을 때)
            String path = storage.writeAssignmentAnswer(sub.getPostId(), sub.getSubmitterId(), md);
            sub.setAnswerMdPath(path);
            submissionRepository.save(sub);
        }
    }

    @Transactional
    public void addAttachmentsToSubmission(Long submissionId, Long userId, List<MultipartFile> files) {
        if (files == null || files.isEmpty()) return;
        AssignmentSubmission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new NotFoundException("Submission not found: " + submissionId));
        if (!sub.getSubmitterId().equals(userId)) {
            throw new IllegalArgumentException("Not your submission");
        }
        try {
            List<AttachmentInfo> newInfos = attachmentStorage.saveAttachments(files);
            List<AttachmentInfo> allInfos = parseAttachmentInfos(sub.getAttachments());
            allInfos.addAll(newInfos);
            sub.setAttachments(buildAttachmentsJson(allInfos));
            submissionRepository.save(sub);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to save attachments", e);
        }
    }

    private List<AttachmentInfo> parseAttachmentInfos(String json) {
        if (json == null || json.isBlank() || !json.startsWith("[")) {
            return new ArrayList<>();
        }
        List<AttachmentInfo> result = new ArrayList<>();
        String content = json.substring(1, json.endsWith("]") ? json.length() - 1 : json.length()).trim();
        if (content.isEmpty()) return result;
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
        if (infos == null || infos.isEmpty()) return "[]";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < infos.size(); i++) {
            if (i > 0) sb.append(",");
            AttachmentInfo info = infos.get(i);
            String url = "\"" + info.url().replace("\"", "\\\"") + "\"";
            String name = info.originalFilename() != null && !info.originalFilename().isBlank()
                    ? "\"" + info.originalFilename().replace("\"", "\\\"") + "\""
                    : "null";
            sb.append("{\"url\":").append(url).append(",\"name\":").append(name).append("}");
        }
        sb.append("]");
        return sb.toString();
    }

    @Transactional
    public void submit(Long submissionId, Long userId) {
        AssignmentSubmission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new NotFoundException("Submission not found: " + submissionId));
        if (!sub.getSubmitterId().equals(userId)) {
            throw new IllegalArgumentException("Not your submission");
        }
        if (sub.getStatus() != SubmissionStatus.DRAFT) {
            throw new IllegalStateException("Already submitted");
        }
        sub.setStatus(SubmissionStatus.SUBMITTED);
        sub.setSubmittedAt(LocalDateTime.now());
        submissionRepository.save(sub);
        notifyAdminsGradingNeeded(sub.getPostId());
    }

    /** 사용자 제출 시 관리자들에게 "평가 필요" 알림 생성 */
    private void notifyAdminsGradingNeeded(Long postId) {
        List<Member> admins = memberRepository.findByRole(UserRole.ADMIN);
        for (Member admin : admins) {
            if (adminGradingNotificationRepository.findByAdminIdAndPostId(admin.getId(), postId).isEmpty()) {
                adminGradingNotificationRepository.save(new AdminGradingNotification(admin.getId(), postId));
            }
        }
    }

    // --- 관리자 평가 ---

    @Transactional
    public void saveReview(Long submissionId, int score, String feedbackText, Long reviewerId) {
        AssignmentSubmission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new NotFoundException("Submission not found: " + submissionId));
        Post post = postRepository.findById(sub.getPostId())
                .orElseThrow(() -> new NotFoundException("Post not found: " + sub.getPostId()));
        int maxScore = post.getMaxScore() != null && post.getMaxScore() > 0 ? post.getMaxScore() : 100;
        int clampedScore = Math.max(0, Math.min(maxScore, score));

        Optional<AssignmentReview> existing = reviewRepository.findBySubmissionId(submissionId);
        if (existing.isPresent()) {
            AssignmentReview review = existing.get();
            review.setScore(clampedScore);
            review.setFeedbackText(feedbackText);
            review.setReviewerId(reviewerId);
            reviewRepository.save(review);
        } else {
            AssignmentReview review = new AssignmentReview(submissionId, clampedScore, feedbackText, reviewerId);
            reviewRepository.save(review);
        }

        // 총점 업데이트 및 상태 변경
        sub.setTotalScore(clampedScore);
        sub.setStatus(SubmissionStatus.GRADED);
        sub.setGradedAt(LocalDateTime.now());
        submissionRepository.save(sub);
        notifyUserGraded(sub.getSubmitterId(), sub.getPostId());
        removeAdminGradingNotificationsIfAllGraded(sub.getPostId());
    }

    /** 세부 실습별 평가 저장 후 제출 총점·상태 반영 */
    @Transactional
    public void saveReviewWithTaskScores(Long submissionId, List<TaskScoreItem> taskScores, Long reviewerId) {
        if (taskScores == null || taskScores.isEmpty()) return;
        AssignmentSubmission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new NotFoundException("Submission not found: " + submissionId));
        Post post = postRepository.findById(sub.getPostId())
                .orElseThrow(() -> new NotFoundException("Post not found: " + sub.getPostId()));
        List<AssignmentTask> tasks = assignmentTaskRepository.findByPostIdOrderBySortOrderAsc(post.getId());
        int totalScore = 0;
        StringBuilder combinedFeedback = new StringBuilder();
        for (TaskScoreItem item : taskScores) {
            AssignmentTask task = tasks.stream().filter(t -> t.getId().equals(item.taskId())).findFirst()
                    .orElseThrow(() -> new NotFoundException("Task not found: " + item.taskId()));
            // 요청 점수 그대로 저장 (0~10000). 세부 실습별 상한은 프론트에서 검증, DB task.maxScore 이슈로 10으로 막히는 것 방지
            int clamped = Math.max(0, Math.min(10000, item.score()));
            totalScore += clamped;
            AssignmentTaskSubmission taskSub = assignmentTaskSubmissionRepository
                    .findBySubmissionIdAndTaskId(submissionId, item.taskId())
                    .orElseGet(() -> assignmentTaskSubmissionRepository.save(new AssignmentTaskSubmission(submissionId, item.taskId())));
            Optional<AssignmentTaskReview> existing = taskReviewRepository.findByTaskSubmissionId(taskSub.getId());
            if (existing.isPresent()) {
                AssignmentTaskReview tr = existing.get();
                tr.setScore(clamped);
                tr.setFeedbackText(item.feedbackText());
                tr.setReviewerId(reviewerId);
                taskReviewRepository.save(tr);
            } else {
                taskReviewRepository.save(new AssignmentTaskReview(taskSub.getId(), clamped, item.feedbackText(), reviewerId));
            }
            if (item.feedbackText() != null && !item.feedbackText().isBlank()) {
                if (combinedFeedback.length() > 0) combinedFeedback.append("\n\n");
                combinedFeedback.append("[").append(task.getTitle()).append("] ").append(item.feedbackText());
            }
        }
        sub.setTotalScore(totalScore);
        sub.setStatus(SubmissionStatus.GRADED);
        sub.setGradedAt(LocalDateTime.now());
        submissionRepository.save(sub);
        Optional<AssignmentReview> existingReview = reviewRepository.findBySubmissionId(submissionId);
        if (existingReview.isPresent()) {
            AssignmentReview r = existingReview.get();
            r.setScore(totalScore);
            r.setFeedbackText(combinedFeedback.length() > 0 ? combinedFeedback.toString() : null);
            r.setReviewerId(reviewerId);
            reviewRepository.save(r);
        } else {
            reviewRepository.save(new AssignmentReview(submissionId, totalScore, combinedFeedback.length() > 0 ? combinedFeedback.toString() : null, reviewerId));
        }
        notifyUserGraded(sub.getSubmitterId(), sub.getPostId());
        removeAdminGradingNotificationsIfAllGraded(sub.getPostId());
    }

    /** 평가 완료 시 제출자에게 "평가 완료" 알림 생성 */
    private void notifyUserGraded(Long userId, Long postId) {
        if (userGradedNotificationRepository.findByUserIdAndPostId(userId, postId).isPresent()) {
            return;
        }
        userGradedNotificationRepository.save(new UserGradedNotification(userId, postId));
    }

    /** 해당 실습의 모든 제출이 평가 완료면 관리자 알림 삭제 */
    private void removeAdminGradingNotificationsIfAllGraded(Long postId) {
        List<AssignmentSubmission> submissions = submissionRepository.findByPostId(postId);
        boolean allGraded = submissions.stream().allMatch(s -> s.getStatus() == SubmissionStatus.GRADED);
        if (allGraded) {
            adminGradingNotificationRepository.findByPostId(postId).forEach(adminGradingNotificationRepository::delete);
        }
    }

    private Post requireAssignmentPost(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Post not found: " + postId));
        if (post.getDeleted()) {
            throw new NotFoundException("Post not found: " + postId);
        }
        if (post.getPostKind() != PostKind.ASSIGNMENT) {
            throw new IllegalArgumentException("Post is not an assignment: " + postId);
        }
        return post;
    }

    /** Member 엔티티 기준 사용자 요약 (표시명·username). 프로젝트에 존재하는 필드만 사용. */
    private AssignmentPageResponse.MemberSummary toMemberSummary(Long memberId) {
        if (memberId == null) return null;
        return memberRepository.findById(memberId)
                .map(m -> new AssignmentPageResponse.MemberSummary(m.getId(), m.getUsername(), m.getName()))
                .orElse(null);
    }

    private AssignmentPageResponse.ReviewItem toReviewItem(AssignmentReview r, Long submissionId, List<AssignmentTask> tasks) {
        String reviewerName = r.getReviewerId() != null
                ? memberRepository.findById(r.getReviewerId()).map(Member::getName).orElse(null)
                : null;
        AssignmentPageResponse.MemberSummary reviewerSummary = toMemberSummary(r.getReviewerId());
        List<AssignmentPageResponse.TaskReviewItem> taskReviews = null;
        if (submissionId != null && tasks != null && !tasks.isEmpty()) {
            List<AssignmentTaskSubmission> taskSubs = assignmentTaskSubmissionRepository.findBySubmissionId(submissionId);
            if (!taskSubs.isEmpty()) {
                List<Long> taskSubIds = taskSubs.stream().map(AssignmentTaskSubmission::getId).toList();
                Map<Long, Long> taskSubIdToTaskId = taskSubs.stream().collect(Collectors.toMap(AssignmentTaskSubmission::getId, AssignmentTaskSubmission::getTaskId));
                Map<Long, AssignmentTask> taskMap = tasks.stream().collect(Collectors.toMap(AssignmentTask::getId, t -> t));
                List<AssignmentTaskReview> list = taskReviewRepository.findByTaskSubmissionIdIn(taskSubIds);
                taskReviews = list.stream()
                        .map(tr -> {
                            Long taskId = taskSubIdToTaskId.get(tr.getTaskSubmissionId());
                            AssignmentTask task = taskMap.get(taskId);
                            int max = task != null && task.getMaxScore() > 0 ? task.getMaxScore() : 100;
                            return new AssignmentPageResponse.TaskReviewItem(taskId, tr.getScore(), max, tr.getFeedbackText());
                        })
                        .toList();
            }
        }
        return new AssignmentPageResponse.ReviewItem(
                r.getScore(),
                r.getFeedbackText(),
                r.getReviewerId(),
                reviewerName,
                reviewerSummary,
                r.getReviewedAt(),
                taskReviews
        );
    }

    /**
     * 관리자 실습 채점 조회: 전체 실습 목록 + (선택 시) 실습별 제출 점수 또는 사용자별 제출 점수.
     * @param assignmentId 실습(과제) ID로 필터 시 해당 실습의 사용자별 점수 목록 반환
     * @param userId 사용자 ID로 필터 시 해당 사용자의 실습별 제출 점수 목록 반환
     */
    @Transactional(readOnly = true)
    public AdminAssignmentGradesDto getAdminAssignmentGrades(Long assignmentId, Long userId) {
        List<Post> assignmentPosts = postRepository.findByDeletedFalseAndPostKindOrderByCreatedAtDesc(PostKind.ASSIGNMENT);
        // 실습별 평가대상자(userId 집합): AssignmentRequest가 있는 사용자만 실습채점조회에 노출
        Map<Long, Set<Long>> postIdToTargetUserIds = new java.util.HashMap<>();
        for (Post p : assignmentPosts) {
            Set<Long> targetIds = assignmentRequestRepository.findByPostId(p.getId()).stream()
                    .map(AssignmentRequest::getUserId)
                    .collect(Collectors.toSet());
            postIdToTargetUserIds.put(p.getId(), targetIds);
        }
        List<AdminAssignmentGradesDto.AssignmentSummary> assignmentSummaries = new ArrayList<>();
        for (Post p : assignmentPosts) {
            List<AssignmentTask> tasks = assignmentTaskRepository.findByPostIdOrderBySortOrderAsc(p.getId());
            List<AdminAssignmentGradesDto.TaskSummary> taskSummaries = tasks.stream()
                    .map(t -> new AdminAssignmentGradesDto.TaskSummary(
                            t.getId(),
                            t.getTitle(),
                            t.getDifficulty() != null ? t.getDifficulty() : "MEDIUM",
                            t.getMaxScore()
                    ))
                    .toList();
            assignmentSummaries.add(new AdminAssignmentGradesDto.AssignmentSummary(
                    p.getId(),
                    p.getTitle(),
                    p.getMaxScore(),
                    taskSummaries
            ));
        }

        List<AdminAssignmentGradesDto.SubmissionGradeRow> byAssignment = new ArrayList<>();
        if (assignmentId != null) {
            Post post = postRepository.findById(assignmentId).filter(p -> p.getPostKind() == PostKind.ASSIGNMENT && !p.getDeleted()).orElse(null);
            if (post != null) {
                Set<Long> targetUserIds = postIdToTargetUserIds.getOrDefault(post.getId(), Set.of());
                List<AssignmentTask> tasks = assignmentTaskRepository.findByPostIdOrderBySortOrderAsc(post.getId());
                List<AssignmentSubmission> submissions = submissionRepository.findByPostId(post.getId()).stream()
                        .filter(sub -> targetUserIds.contains(sub.getSubmitterId()))
                        .toList();
                int maxScore = post.getMaxScore() != null ? post.getMaxScore() : 100;
                for (AssignmentSubmission sub : submissions) {
                    String name = memberRepository.findById(sub.getSubmitterId()).map(Member::getName).orElse("사용자 " + sub.getSubmitterId());
                    List<AdminAssignmentGradesDto.TaskScoreCell> cells = new ArrayList<>();
                    List<AssignmentTaskSubmission> taskSubs = assignmentTaskSubmissionRepository.findBySubmissionId(sub.getId());
                    Map<Long, Integer> taskIdToScore = new java.util.HashMap<>();
                    for (AssignmentTaskSubmission ts : taskSubs) {
                        taskReviewRepository.findByTaskSubmissionId(ts.getId())
                                .ifPresent(tr -> taskIdToScore.put(ts.getTaskId(), tr.getScore()));
                    }
                    int total = 0;
                    for (AssignmentTask task : tasks) {
                        int score = taskIdToScore.getOrDefault(task.getId(), 0);
                        total += score;
                        cells.add(new AdminAssignmentGradesDto.TaskScoreCell(
                                task.getId(),
                                task.getTitle(),
                                task.getDifficulty() != null ? task.getDifficulty() : "MEDIUM",
                                score,
                                task.getMaxScore()
                        ));
                    }
                    byAssignment.add(new AdminAssignmentGradesDto.SubmissionGradeRow(
                            sub.getId(),
                            sub.getSubmitterId(),
                            name,
                            sub.getStatus().name(),
                            total,
                            maxScore,
                            cells
                    ));
                }
            }
        }

        List<AdminAssignmentGradesDto.UserSubmissionRow> byUser = new ArrayList<>();
        if (userId != null) {
            Map<Long, AssignmentSubmission> postIdToSubmission = submissionRepository.findBySubmitterIdOrderBySubmittedAtDesc(userId).stream()
                    .collect(Collectors.toMap(AssignmentSubmission::getPostId, s -> s, (a, b) -> a));
            for (Post p : assignmentPosts) {
                if (p.getDeleted()) continue;
                if (!postIdToTargetUserIds.getOrDefault(p.getId(), Set.of()).contains(userId)) continue; // 평가대상만
                List<AssignmentTask> tasks = assignmentTaskRepository.findByPostIdOrderBySortOrderAsc(p.getId());
                int maxScore = p.getMaxScore() != null ? p.getMaxScore() : 100;
                AssignmentSubmission sub = postIdToSubmission.get(p.getId());
                if (sub != null) {
                    List<AdminAssignmentGradesDto.TaskScoreCell> cells = new ArrayList<>();
                    int total = 0;
                    List<AssignmentTaskSubmission> taskSubs = assignmentTaskSubmissionRepository.findBySubmissionId(sub.getId());
                    Map<Long, Integer> taskIdToScore = new java.util.HashMap<>();
                    for (AssignmentTaskSubmission ts : taskSubs) {
                        taskReviewRepository.findByTaskSubmissionId(ts.getId())
                                .ifPresent(tr -> taskIdToScore.put(ts.getTaskId(), tr.getScore()));
                    }
                    for (AssignmentTask task : tasks) {
                        int score = taskIdToScore.getOrDefault(task.getId(), 0);
                        total += score;
                        cells.add(new AdminAssignmentGradesDto.TaskScoreCell(
                                task.getId(),
                                task.getTitle(),
                                task.getDifficulty() != null ? task.getDifficulty() : "MEDIUM",
                                score,
                                task.getMaxScore()
                        ));
                    }
                    byUser.add(new AdminAssignmentGradesDto.UserSubmissionRow(
                            p.getId(),
                            p.getTitle(),
                            sub.getId(),
                            sub.getStatus().name(),
                            total,
                            maxScore,
                            cells
                    ));
                } else {
                    List<AdminAssignmentGradesDto.TaskScoreCell> emptyCells = new ArrayList<>();
                    for (AssignmentTask task : tasks) {
                        emptyCells.add(new AdminAssignmentGradesDto.TaskScoreCell(
                                task.getId(),
                                task.getTitle(),
                                task.getDifficulty() != null ? task.getDifficulty() : "MEDIUM",
                                0,
                                task.getMaxScore()
                        ));
                    }
                    byUser.add(new AdminAssignmentGradesDto.UserSubmissionRow(
                            p.getId(),
                            p.getTitle() != null ? p.getTitle() : "(제목 없음)",
                            0L,
                            "DRAFT",
                            0,
                            maxScore,
                            emptyCells
                    ));
                }
            }
        }

        List<AdminAssignmentGradesDto.AllSubmissionRow> allSubmissions = new ArrayList<>();
        if (assignmentId == null && userId == null) {
            Set<Long> targetUserIdsForPost = new HashSet<>();
            for (Post p : assignmentPosts) {
                if (p.getDeleted()) continue;
                targetUserIdsForPost.clear();
                targetUserIdsForPost.addAll(postIdToTargetUserIds.getOrDefault(p.getId(), Set.of()));
                List<AssignmentTask> tasks = assignmentTaskRepository.findByPostIdOrderBySortOrderAsc(p.getId());
                int maxScore = p.getMaxScore() != null ? p.getMaxScore() : 100;
                List<AssignmentSubmission> submissions = submissionRepository.findByPostId(p.getId()).stream()
                        .filter(sub -> targetUserIdsForPost.contains(sub.getSubmitterId()))
                        .toList();
                Set<Long> submittedUserIds = submissions.stream()
                        .map(AssignmentSubmission::getSubmitterId)
                        .collect(Collectors.toSet());
                List<AdminAssignmentGradesDto.TaskScoreCell> emptyCells = new ArrayList<>();
                for (AssignmentTask task : tasks) {
                    emptyCells.add(new AdminAssignmentGradesDto.TaskScoreCell(
                            task.getId(),
                            task.getTitle(),
                            task.getDifficulty() != null ? task.getDifficulty() : "MEDIUM",
                            0,
                            task.getMaxScore()
                    ));
                }
                String postTitle = p.getTitle() != null ? p.getTitle() : "(제목 없음)";
                for (Long targetUid : targetUserIdsForPost) {
                    Member member = memberRepository.findById(targetUid).orElse(null);
                    if (member == null || member.getRole() == UserRole.ADMIN) continue;
                    if (!submittedUserIds.contains(member.getId())) {
                        allSubmissions.add(new AdminAssignmentGradesDto.AllSubmissionRow(
                                p.getId(),
                                postTitle,
                                0L,
                                member.getId(),
                                member.getName(),
                                "DRAFT",
                                0,
                                maxScore,
                                emptyCells
                        ));
                    }
                }
                for (AssignmentSubmission sub : submissions) {
                    String name = memberRepository.findById(sub.getSubmitterId()).map(Member::getName).orElse("사용자 " + sub.getSubmitterId());
                    List<AdminAssignmentGradesDto.TaskScoreCell> cells = new ArrayList<>();
                    List<AssignmentTaskSubmission> taskSubs = assignmentTaskSubmissionRepository.findBySubmissionId(sub.getId());
                    Map<Long, Integer> taskIdToScore = new java.util.HashMap<>();
                    for (AssignmentTaskSubmission ts : taskSubs) {
                        taskReviewRepository.findByTaskSubmissionId(ts.getId())
                                .ifPresent(tr -> taskIdToScore.put(ts.getTaskId(), tr.getScore()));
                    }
                    int total = 0;
                    for (AssignmentTask task : tasks) {
                        int score = taskIdToScore.getOrDefault(task.getId(), 0);
                        total += score;
                        cells.add(new AdminAssignmentGradesDto.TaskScoreCell(
                                task.getId(),
                                task.getTitle(),
                                task.getDifficulty() != null ? task.getDifficulty() : "MEDIUM",
                                score,
                                task.getMaxScore()
                        ));
                    }
                    allSubmissions.add(new AdminAssignmentGradesDto.AllSubmissionRow(
                            p.getId(),
                            p.getTitle(),
                            sub.getId(),
                            sub.getSubmitterId(),
                            name,
                            sub.getStatus().name(),
                            total,
                            maxScore,
                            cells
                    ));
                }
            }
        }

        return new AdminAssignmentGradesDto(assignmentSummaries, byAssignment, byUser, allSubmissions);
    }
}
