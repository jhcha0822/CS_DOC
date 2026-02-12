package com.fasoo.cs_doc.post.service;

import com.fasoo.cs_doc.global.exception.NotFoundException;
import com.fasoo.cs_doc.member.repository.MemberRepository;
import com.fasoo.cs_doc.post.domain.Comment;
import com.fasoo.cs_doc.post.dto.CommentCreateRequest;
import com.fasoo.cs_doc.post.dto.CommentResponse;
import com.fasoo.cs_doc.post.dto.CommentUpdateRequest;
import com.fasoo.cs_doc.post.repository.CommentRepository;
import com.fasoo.cs_doc.post.repository.PostRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final MemberRepository memberRepository;

    public CommentService(CommentRepository commentRepository, PostRepository postRepository, MemberRepository memberRepository) {
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.memberRepository = memberRepository;
    }

    @Transactional
    public CommentResponse create(CommentCreateRequest req) {
        // 게시글 존재 확인
        if (!postRepository.existsById(req.postId())) {
            throw new NotFoundException("Post not found: " + req.postId());
        }

        Comment comment = new Comment(req.postId(), req.content());
        if (req.userId() != null) {
            comment.changeCreatedBy(req.userId());
            comment.changeUpdatedBy(req.userId());
        }

        Comment saved = commentRepository.save(comment);
        return toResponse(saved);
    }

    @Transactional
    public CommentResponse update(Long id, CommentUpdateRequest req) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Comment not found: " + id));

        // 권한 체크: 댓글 작성자만 수정 가능
        if (req.userId() == null) {
            throw new IllegalStateException("User ID is required to update a comment");
        }
        if (comment.getCreatedBy() == null || !comment.getCreatedBy().equals(req.userId())) {
            throw new IllegalStateException("Only the comment author can update this comment");
        }

        comment.changeContent(req.content());
        comment.changeUpdatedBy(req.userId());

        Comment updated = commentRepository.save(comment);
        return toResponse(updated);
    }

    @Transactional
    public void delete(Long id, Long userId) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Comment not found: " + id));

        // 권한 체크: 댓글 작성자 또는 ADMIN 권한 사용자만 삭제 가능
        if (userId == null) {
            throw new IllegalStateException("User ID is required to delete a comment");
        }

        // ADMIN 권한 체크
        boolean isAdmin = memberRepository.findById(userId)
                .map(m -> m.getRole() == com.fasoo.cs_doc.member.domain.UserRole.ADMIN)
                .orElse(false);

        // 작성자가 아니고 ADMIN도 아니면 삭제 불가
        if (comment.getCreatedBy() == null || !comment.getCreatedBy().equals(userId)) {
            if (!isAdmin) {
                throw new IllegalStateException("Only the comment author or admin can delete this comment");
            }
        }

        commentRepository.delete(comment);
    }

    public List<CommentResponse> findByPostId(Long postId) {
        List<Comment> comments = commentRepository.findByPostIdOrderByCreatedAtAsc(postId);
        return comments.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public long countByPostId(Long postId) {
        return commentRepository.countByPostId(postId);
    }

    private CommentResponse toResponse(Comment comment) {
        return new CommentResponse(
                comment.getId(),
                comment.getPostId(),
                comment.getContent(),
                comment.getCreatedBy(),
                getUserName(comment.getCreatedBy()),
                comment.getUpdatedBy(),
                getUserName(comment.getUpdatedBy()),
                comment.getCreatedAt(),
                comment.getUpdatedAt()
        );
    }

    private String getUserName(Long userId) {
        if (userId == null) return null;
        return memberRepository.findById(userId)
                .map(m -> m.getName())
                .orElse(null);
    }
}
