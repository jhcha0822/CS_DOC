-- members 테이블에 name 컬럼 추가
ALTER TABLE members ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT '사용자';

-- 기존 데이터에 기본값 설정 (username을 name으로 사용)
UPDATE members SET name = username WHERE name IS NULL OR name = '사용자';
