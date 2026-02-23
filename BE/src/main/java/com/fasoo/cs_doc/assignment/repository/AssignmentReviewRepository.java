package com.fasoo.cs_doc.assignment.repository;

import com.fasoo.cs_doc.assignment.domain.AssignmentReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssignmentReviewRepository extends JpaRepository<AssignmentReview, Long> {
    Optional<AssignmentReview> findBySubmissionId(Long submissionId);
    List<AssignmentReview> findBySubmissionIdIn(List<Long> submissionIds);
}
