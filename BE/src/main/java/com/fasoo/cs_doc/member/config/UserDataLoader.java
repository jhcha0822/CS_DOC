package com.fasoo.cs_doc.member.config;

import com.fasoo.cs_doc.member.domain.Member;
import com.fasoo.cs_doc.member.domain.UserRole;
import com.fasoo.cs_doc.member.repository.MemberRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 애플리케이션 기동 시 기본 관리자 계정(admin/1111)이 없으면 생성.
 */
@Component
@Order(2)
public class UserDataLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(UserDataLoader.class);

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    public UserDataLoader(MemberRepository memberRepository, PasswordEncoder passwordEncoder) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        String adminUsername = "admin";
        
        if (memberRepository.existsByUsername(adminUsername)) {
            log.info("기본 관리자 계정({})이 이미 존재합니다.", adminUsername);
            return;
        }

        Member admin = Member.builder()
                .username(adminUsername)
                .password(passwordEncoder.encode("1111"))
                .name("관리자")
                .role(UserRole.ADMIN)
                .build();

        memberRepository.save(admin);
        log.info("기본 관리자 계정 생성 완료: username={}, name=관리자, password=1111, role=ADMIN", adminUsername);
    }
}
