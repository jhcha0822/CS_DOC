package com.fasoo.cs_doc.assignment.repository;

import com.fasoo.cs_doc.assignment.domain.AssignmentTaskSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssignmentTaskSubmissionRepository extends JpaRepository<AssignmentTaskSubmission, Long> {
    List<AssignmentTaskSubmission> findBySubmissionId(Long submissionId);
    Optional<AssignmentTaskSubmission> findBySubmissionIdAndTaskId(Long submissionId, Long taskId);
}
