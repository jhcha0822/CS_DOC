package com.fasoo.cs_doc.global.config;

import org.apache.catalina.connector.Connector;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * multipart 요청 시 part 개수 상한 확대.
 * Tomcat 기본값(50) 초과 시 FileCountLimitExceededException이 발생하므로,
 * md + 이미지 다수 선택 업로드가 가능하도록 500으로 설정.
 */
@Configuration
public class TomcatMultipartConfig {

    private static final int MAX_PART_COUNT = 500;

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatMaxPartCountCustomizer() {
        return factory -> factory.addConnectorCustomizers((Connector connector) ->
                connector.setMaxPartCount(MAX_PART_COUNT));
    }
}
