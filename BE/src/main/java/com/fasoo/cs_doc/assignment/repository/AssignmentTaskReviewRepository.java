package com.fasoo.cs_doc.assignment.repository;

import com.fasoo.cs_doc.assignment.domain.AssignmentTaskReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssignmentTaskReviewRepository extends JpaRepository<AssignmentTaskReview, Long> {
    Optional<AssignmentTaskReview> findByTaskSubmissionId(Long taskSubmissionId);
    List<AssignmentTaskReview> findByTaskSubmissionIdIn(List<Long> taskSubmissionIds);
}
