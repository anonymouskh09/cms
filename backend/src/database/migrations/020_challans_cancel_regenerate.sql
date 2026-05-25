-- Add challan cancel/regenerate tracking columns
SET @dbname = DATABASE();

SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'challans' AND COLUMN_NAME = 'cancelled_reason');
SET @sql = IF(@exists = 0,
  'ALTER TABLE challans
   ADD COLUMN cancelled_reason TEXT NULL AFTER pdf_url,
   ADD COLUMN cancelled_by INT NULL AFTER cancelled_reason,
   ADD COLUMN cancelled_at TIMESTAMP NULL AFTER cancelled_by,
   ADD COLUMN regenerated_from_id INT NULL AFTER cancelled_at,
   ADD FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
   ADD FOREIGN KEY (regenerated_from_id) REFERENCES challans(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
