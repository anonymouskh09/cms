-- Phase 2: Exam schedules invigilator (safe additive migration)
SET @dbname = DATABASE();
SET @exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'exam_schedules' AND COLUMN_NAME = 'invigilator_id'
);
SET @sql = IF(
  @exists = 0,
  'ALTER TABLE exam_schedules ADD COLUMN invigilator_id INT NULL AFTER room, ADD FOREIGN KEY (invigilator_id) REFERENCES teachers(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
