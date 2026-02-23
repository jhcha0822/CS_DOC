package com.fasoo.cs_doc.assignment.repository;

import com.fasoo.cs_doc.assignment.domain.AssignmentTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssignmentTaskRepository extends JpaRepository<AssignmentTask, Long> {
    List<AssignmentTask> findByPostIdOrderBySortOrderAsc(Long postId);
    void deleteAllByPostId(Long postId);
}
