package com.fasoo.cs_doc.assignment.service;

import com.fasoo.cs_doc.assignment.domain.AssignmentRequest;
import com.fasoo.cs_doc.assignment.domain.AssignmentSubmission;
import com.fasoo.cs_doc.assignment.domain.SubmissionStatus;
import com.fasoo.cs_doc.assignment.dto.AssignmentRequestResponse;
import com.fasoo.cs_doc.assignment.dto.CreateAssignmentRequestsRequest;
import com.fasoo.cs_doc.assignment.repository.AssignmentRequestRepository;
import com.fasoo.cs_doc.assignment.repository.AssignmentSubmissionRepository;
import com.fasoo.cs_doc.global.exception.NotFoundException;
import com.fasoo.cs_doc.member.domain.UserRole;
import com.fasoo.cs_doc.member.repository.MemberRepository;
import com.fasoo.cs_doc.post.domain.Post;
import com.fasoo.cs_doc.post.domain.PostKind;
import com.fasoo.cs_doc.post.repository.PostRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class AssignmentRequestService {

    private final AssignmentRequestRepository assignmentRequestRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final PostRepository postRepository;
    private final MemberRepository memberRepository;

    public AssignmentRequestService(AssignmentRequestRepository assignmentRequestRepository,
                                    AssignmentSubmissionRepository submissionRepository,
                                    PostRepository postRepository,
                                    MemberRepository memberRepository) {
        this.assignmentRequestRepository = assignmentRequestRepository;
        this.submissionRepository = submissionRepository;
        this.postRepository = postRepository;
        this.memberRepository = memberRepository;
    }

    /** 관리자: 특정 실습에 대해 사용자들에게 실습 결과 작성 요청 생성 */
    @Transactional
    public List<AssignmentRequestResponse> createRequests(CreateAssignmentRequestsRequest req, Long adminUserId) {
        if (adminUserId == null) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        if (memberRepository.findById(adminUserId).map(m -> m.getRole()).orElse(null) != UserRole.ADMIN) {
            throw new IllegalArgumentException("관리자만 실습 결과 작성 요청을 보낼 수 있습니다.");
        }
        Post post = postRepository.findById(req.postId())
                .orElseThrow(() -> new NotFoundException("Post not found: " + req.postId()));
        if (post.getPostKind() != PostKind.ASSIGNMENT) {
            throw new IllegalArgumentException("실습(과제) 게시글만 요청할 수 있습니다.");
        }
        List<AssignmentRequestResponse> result = new ArrayList<>();
        for (Long userId : req.userIds()) {
            AssignmentRequest ar = new AssignmentRequest(post.getId(), userId, adminUserId);
            AssignmentRequest saved = assignmentRequestRepository.save(ar);
            result.add(toResponse(saved));
        }
        return result;
    }

    /** 내 미확인 요청 목록 (로그인/페이지 이동 시 모달용). 제출 완료된 실습은 제외(팝업 안 뜸). */
    @Transactional(readOnly = true)
    public List<AssignmentRequestResponse> findUnreadByUserId(Long userId) {
        List<AssignmentRequest> list = assignmentRequestRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId);
        return list.stream()
                .filter(ar -> !hasSubmitted(ar.getPostId(), userId))
                .map(this::toResponse)
                .toList();
    }

    /** 할 일 실습 목록 (종 버튼 클릭 시): 아직 제출하지 않은 요청만 (read 여부 무관) */
    @Transactional(readOnly = true)
    public List<AssignmentRequestResponse> findTodoByUserId(Long userId) {
        List<AssignmentRequest> list = assignmentRequestRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return list.stream()
                .filter(ar -> !hasSubmitted(ar.getPostId(), userId))
                .map(this::toResponse)
                .toList();
    }

    private boolean hasSubmitted(Long postId, Long userId) {
        return submissionRepository.findByPostIdAndSubmitterId(postId, userId)
                .filter(sub -> sub.getStatus() == SubmissionStatus.SUBMITTED || sub.getStatus() == SubmissionStatus.GRADED)
                .isPresent();
    }

    /** 요청 확인 처리 (모달에서 확인 클릭 시) */
    @Transactional
    public void markAsRead(Long requestId, Long userId) {
        AssignmentRequest ar = assignmentRequestRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("AssignmentRequest not found: " + requestId));
        if (!ar.getUserId().equals(userId)) {
            throw new IllegalArgumentException("본인의 요청만 확인 처리할 수 있습니다.");
        }
        ar.markAsRead();
        assignmentRequestRepository.save(ar);
    }

    private AssignmentRequestResponse toResponse(AssignmentRequest ar) {
        String postTitle = postRepository.findById(ar.getPostId())
                .map(Post::getTitle)
                .orElse("");
        String requestedByName = memberRepository.findById(ar.getRequestedBy())
                .map(m -> m.getName())
                .orElse(null);
        return new AssignmentRequestResponse(
                ar.getId(),
                ar.getPostId(),
                postTitle,
                ar.getRequestedBy(),
                requestedByName,
                ar.getCreatedAt(),
                ar.getReadAt()
        );
    }
}
