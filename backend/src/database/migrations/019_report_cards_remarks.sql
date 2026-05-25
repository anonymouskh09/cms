-- Add separate remark fields for report cards
SET @dbname = DATABASE();

SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'report_cards' AND COLUMN_NAME = 'teacher_remarks');
SET @sql = IF(@exists = 0,
  'ALTER TABLE report_cards ADD COLUMN teacher_remarks TEXT NULL AFTER remarks, ADD COLUMN principal_remarks TEXT NULL AFTER teacher_remarks',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
