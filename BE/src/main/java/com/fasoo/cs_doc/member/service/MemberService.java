package com.fasoo.cs_doc.member.service;

import com.fasoo.cs_doc.global.exception.NotFoundException;
import com.fasoo.cs_doc.member.domain.Member;
import com.fasoo.cs_doc.member.domain.UserRole;
import com.fasoo.cs_doc.member.dto.UserCreateRequest;
import com.fasoo.cs_doc.member.dto.UserResponse;
import com.fasoo.cs_doc.member.dto.UserUpdateRequest;
import com.fasoo.cs_doc.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MemberService {
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return memberRepository.findAll().stream()
                .map(m -> new UserResponse(m.getId(), m.getUsername(), m.getName(), m.getRole()))
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse findById(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User", id));
        return new UserResponse(member.getId(), member.getUsername(), member.getName(), member.getRole());
    }

    public UserResponse create(UserCreateRequest request) {
        if (memberRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("이미 존재하는 사용자 ID입니다: " + request.username());
        }

        Member member = Member.builder()
                .username(request.username())
                .password(passwordEncoder.encode(request.password()))
                .name(request.name())
                .role(request.role())
                .build();

        Member saved = memberRepository.save(member);
        return new UserResponse(saved.getId(), saved.getUsername(), saved.getName(), saved.getRole());
    }

    public UserResponse update(Long id, UserUpdateRequest request) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User", id));

        if (request.password() != null && !request.password().trim().isEmpty()) {
            member.changePassword(passwordEncoder.encode(request.password()));
        }
        if (request.name() != null && !request.name().trim().isEmpty()) {
            member.changeName(request.name());
        }
        member.changeRole(request.role());

        Member updated = memberRepository.save(member);
        return new UserResponse(updated.getId(), updated.getUsername(), updated.getName(), updated.getRole());
    }

    public void delete(Long id) {
        if (!memberRepository.existsById(id)) {
            throw new NotFoundException("User", id);
        }
        memberRepository.deleteById(id);
    }
}
