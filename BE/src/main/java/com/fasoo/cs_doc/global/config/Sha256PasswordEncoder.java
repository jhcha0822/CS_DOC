package com.fasoo.cs_doc.global.config;

import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * 비밀번호를 SHA-256 해시 후 16진수 문자열로 저장하는 인코더.
 * DB에는 평문이 아닌 SHA-256 해시값만 저장됩니다.
 */
public class Sha256PasswordEncoder implements PasswordEncoder {

    private static final String ALGORITHM = "SHA-256";

    @Override
    public String encode(CharSequence rawPassword) {
        if (rawPassword == null) return "";
        return sha256Hex(rawPassword.toString());
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (encodedPassword == null || encodedPassword.isEmpty()) {
            return rawPassword == null || rawPassword.length() == 0;
        }
        return encode(rawPassword).equals(encodedPassword);
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance(ALGORITHM);
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(ALGORITHM + " not available", e);
        }
    }
}
