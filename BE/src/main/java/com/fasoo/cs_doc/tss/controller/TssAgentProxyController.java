package com.fasoo.cs_doc.tss.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * 브라우저는 본 API만 호출하고, 서버가 사내 TSS 에이전트로 요청을 전달한다.
 * (정적 dist + run.bat 환경에서도 Vite 프록시 없이 동작)
 */
@RestController
@RequestMapping("/api/tss-agent")
public class TssAgentProxyController {

    private final RestClient restClient;
    private final String respondUrl;

    public TssAgentProxyController(@Value("${app.tss-agent.base-url}") String baseUrl) {
        String trimmed = baseUrl == null ? "" : baseUrl.trim().replaceAll("/+$", "");
        this.respondUrl = trimmed + "/api/v1/agent/respond";
        this.restClient = RestClient.create();
    }

    @PostMapping(value = "/respond", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> respond(@RequestBody String body) {
        try {
            return restClient.post()
                    .uri(respondUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toEntity(String.class);
        } catch (RestClientResponseException e) {
            String errBody = e.getResponseBodyAsString();
            if (errBody == null || errBody.isEmpty()) {
                errBody = "{\"message\":\"" + escapeJson(e.getMessage()) + "\"}";
            }
            return ResponseEntity.status(e.getStatusCode()).contentType(MediaType.APPLICATION_JSON).body(errBody);
        } catch (Exception e) {
            String msg = escapeJson(e.getMessage() != null ? e.getMessage() : "upstream error");
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"message\":\"" + msg + "\"}");
        }
    }

    private static String escapeJson(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", " ");
    }
}
