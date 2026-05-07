-- 게시글 소프트 삭제 사유 (Microsoft SQL Server)
-- 오류 원인: T-SQL에서는 "ADD COLUMN"이 아니라 "ADD 열이름" 형식만 유효합니다.
IF COL_LENGTH('post', 'deletion_reason') IS NULL
BEGIN
    ALTER TABLE post ADD deletion_reason NVARCHAR(2000) NULL;
END
GO

-- (참고) MySQL / MariaDB / H2 등에서는 아래 형태를 사용합니다.
-- ALTER TABLE post ADD COLUMN deletion_reason VARCHAR(2000) NULL;
