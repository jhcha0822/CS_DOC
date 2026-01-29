package com.fasoo.cs_doc.post.repository;

import com.fasoo.cs_doc.post.domain.Post;
import com.fasoo.cs_doc.post.domain.PostCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    Page<Post> findByTitleContainingIgnoreCase(String keyword, Pageable pageable);
    Page<Post> findByCategoryIn(List<PostCategory> categories, Pageable pageable);
    Page<Post> findByCategoryInAndTitleContainingIgnoreCase(List<PostCategory> categories, String keyword, Pageable pageable);
    List<Post> findByCategoryInOrderByCreatedAtDesc(List<PostCategory> categories);
}
