-- Migration script to add is_notice column to post table
-- Run this script in H2 Console: http://localhost:8080/h2-console
-- JDBC URL: jdbc:h2:file:./CS_DOC_DATA/h2/csdoc

-- Step 1: Add is_notice column with default value
-- H2 doesn't support IF NOT EXISTS, so if column already exists, this will fail
-- In that case, you can skip this step

-- First, add the column as nullable
ALTER TABLE post ADD COLUMN is_notice BOOLEAN DEFAULT FALSE;

-- Then, update existing rows to set default value
UPDATE post SET is_notice = FALSE WHERE is_notice IS NULL;

-- Finally, make it NOT NULL
ALTER TABLE post ALTER COLUMN is_notice BOOLEAN NOT NULL;
