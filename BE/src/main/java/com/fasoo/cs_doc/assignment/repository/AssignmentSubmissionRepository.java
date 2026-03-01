package com.fasoo.cs_doc.assignment.repository;

import com.fasoo.cs_doc.assignment.domain.AssignmentSubmission;
import com.fasoo.cs_doc.assignment.domain.SubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Long> {
    Optional<AssignmentSubmission> findByPostIdAndSubmitterId(Long postId, Long submitterId);
    List<AssignmentSubmission> findByPostId(Long postId);
    List<AssignmentSubmission> findBySubmitterIdOrderBySubmittedAtDesc(Long submitterId);
}
