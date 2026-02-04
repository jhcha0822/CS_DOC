-- Migration script to add depth column to category table
-- Run this script in H2 Console: http://localhost:8080/h2-console
-- JDBC URL: jdbc:h2:file:./CS_DOC_DATA/h2/csdoc

-- Step 1: Add depth column (H2 doesn't support IF NOT EXISTS, so check manually first)
ALTER TABLE category ADD COLUMN depth INT NOT NULL DEFAULT 0;

-- Step 2: Update existing records
-- Top-level categories (parent_id IS NULL) should have depth = 0
UPDATE category SET depth = 0 WHERE parent_id IS NULL;

-- Child categories (parent_id IS NOT NULL) should have depth = 1
-- Note: This assumes only 2 levels. If you have deeper nesting, adjust accordingly.
UPDATE category SET depth = 1 WHERE parent_id IS NOT NULL;
