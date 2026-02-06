-- Migration script to make category column nullable in post table
-- Run this script in H2 Console: http://localhost:8080/h2-console
-- JDBC URL: jdbc:h2:file:./CS_DOC_DATA/h2/csdoc

-- Step 1: Make category column nullable
-- H2 doesn't support ALTER COLUMN ... NULL directly, so we need to:
-- 1. Create a new table with nullable category
-- 2. Copy data
-- 3. Drop old table
-- 4. Rename new table

-- However, H2 supports ALTER TABLE ... ALTER COLUMN ... NULL in newer versions
-- Let's try the simpler approach first:
ALTER TABLE post ALTER COLUMN category VARCHAR(32) NULL;

-- If the above doesn't work, use this alternative approach:
-- CREATE TABLE post_new (
--     id BIGINT AUTO_INCREMENT PRIMARY KEY,
--     title VARCHAR(200) NOT NULL,
--     category VARCHAR(32) NULL,
--     category_id BIGINT NOT NULL,
--     content_md_path VARCHAR(500) NULL,
--     created_at TIMESTAMP NOT NULL,
--     updated_at TIMESTAMP NOT NULL
-- );
-- 
-- INSERT INTO post_new (id, title, category, category_id, content_md_path, created_at, updated_at)
-- SELECT id, title, category, category_id, content_md_path, created_at, updated_at FROM post;
-- 
-- DROP TABLE post;
-- ALTER TABLE post_new RENAME TO post;
