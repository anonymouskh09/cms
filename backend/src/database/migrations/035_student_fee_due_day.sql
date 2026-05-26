SET @dbname = DATABASE();

SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_fee_profiles' AND COLUMN_NAME = 'due_day');
SET @sql = IF(@exists = 0,
  'ALTER TABLE student_fee_profiles ADD COLUMN due_day INT NULL DEFAULT 10 AFTER notes',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
