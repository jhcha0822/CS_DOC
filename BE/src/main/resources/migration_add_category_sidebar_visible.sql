-- category.sidebar_visible (Microsoft SQL Server)
IF COL_LENGTH('category', 'sidebar_visible') IS NULL
BEGIN
    ALTER TABLE category ADD sidebar_visible BIT NOT NULL CONSTRAINT DF_category_sidebar_visible DEFAULT (1);
END
GO

