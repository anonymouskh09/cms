-- Phase 2: Timetable publish flag (safe additive migration)
SET @dbname = DATABASE();
SET @exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'timetable_entries'
    AND COLUMN_NAME = 'is_published'
);
SET @sql = IF(
  @exists = 0,
  'ALTER TABLE timetable_entries ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT FALSE AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE INDEX idx_timetable_entries_published ON timetable_entries(institution_id, class_id, section_id, is_published);
