-- 삭제된 메모 보관 테이블 (Microsoft SQL Server)
IF OBJECT_ID(N'deleted_memo', N'U') IS NULL
BEGIN
    CREATE TABLE deleted_memo (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        source_memo_id BIGINT NOT NULL,
        title NVARCHAR(500) NOT NULL,
        body NVARCHAR(MAX) NULL,
        images NVARCHAR(4000) NULL,
        original_created_at DATETIME2 NOT NULL,
        original_created_by BIGINT NULL,
        original_updated_by BIGINT NULL,
        deleted_at DATETIME2 NOT NULL,
        deleted_by BIGINT NULL,
        deletion_reason NVARCHAR(2000) NOT NULL
    );
    CREATE INDEX idx_deleted_memo_deleted_at ON deleted_memo(deleted_at);
END
GO
