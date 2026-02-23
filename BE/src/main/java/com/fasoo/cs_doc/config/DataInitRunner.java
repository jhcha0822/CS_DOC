package com.fasoo.cs_doc.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * data-init 프로필 활성화 시 실행되어 카테고리·게시글을 초기화합니다.
 * 사용: --spring.profiles.active=data-init
 */
@Component
@Profile("data-init")
@Order(0)
public class DataInitRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitRunner.class);

    private final DataInitService dataInitService;

    public DataInitRunner(DataInitService dataInitService) {
        this.dataInitService = dataInitService;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.warn("data-init 프로필 활성화됨. 실습(과제)·댓글·post_version·post·category 전체 삭제 후 기본 카테고리 재생성합니다.");
        dataInitService.resetAll();
    }
}
