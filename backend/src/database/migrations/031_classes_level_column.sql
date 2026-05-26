-- Ensure classes.level exists (some older DBs may lack it)
SET @dbname = DATABASE();
SET @exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'classes'
    AND COLUMN_NAME = 'level'
);
SET @sql = IF(
  @exists = 0,
  'ALTER TABLE classes ADD COLUMN level INT NULL AFTER name',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
