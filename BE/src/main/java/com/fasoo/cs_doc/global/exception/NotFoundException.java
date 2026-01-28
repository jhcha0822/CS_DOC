package com.fasoo.cs_doc.global.exception;

public class NotFoundException extends RuntimeException {

    /** 직접 메시지 지정 */
    public NotFoundException(String message) {
        super(message);
    }

    /** 리소스 + 식별자로 메시지 자동 생성 */
    public NotFoundException(String resource, Object key) {
        super(resource + " not found: " + key);
    }
}
