package com.fasoo.cs_doc.member.repository;

import com.fasoo.cs_doc.member.domain.Member;
import com.fasoo.cs_doc.member.domain.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByUsername(String username);
    boolean existsByUsername(String username);
    List<Member> findByRole(UserRole role);
}

