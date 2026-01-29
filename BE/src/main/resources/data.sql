-- =========================
-- SYSTEM (업무시스템)
-- =========================
MERGE INTO post (id, title, category, created_at, updated_at)
VALUES
    (1, '업무시스템 개요 문서', 'SYSTEM', NOW(), NOW()),
    (2, '업무시스템 장애 대응 가이드', 'SYSTEM', NOW(), NOW()),
    (3, '업무시스템 로그 수집 방법', 'SYSTEM', NOW(), NOW());

-- =========================
-- TRAINING (신입 교육 자료)
-- =========================
MERGE INTO post (id, title, category, created_at, updated_at)
VALUES
    (10, '신입 교육 온보딩 문서', 'TRAINING', NOW(), NOW()),
    (11, 'Spring Boot 기초 교육', 'TRAINING', NOW(), NOW());

-- =========================
-- INCIDENT (장애 지원)
-- =========================
MERGE INTO post (id, title, category, created_at, updated_at)
VALUES
    (20, 'Edge 브라우저 DRM 충돌 이슈', 'INCIDENT', NOW(), NOW()),
    (21, 'svchost 메모리 누수 분석 사례', 'INCIDENT', NOW(), NOW());