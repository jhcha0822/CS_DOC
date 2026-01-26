package com.fasoo.cs_doc.post.repository;

import com.fasoo.cs_doc.post.domain.Post;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRepository extends JpaRepository<Post, Long> {
}
