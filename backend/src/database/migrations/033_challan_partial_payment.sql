-- Partial payments on challans

SET @dbname = DATABASE();

SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'challans' AND COLUMN_NAME = 'amount_paid');
SET @sql = IF(@exists = 0,
  'ALTER TABLE challans ADD COLUMN amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total_amount',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_partial = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'challans' AND COLUMN_NAME = 'status'
    AND COLUMN_TYPE LIKE '%partial%');
SET @sql2 = IF(@has_partial = 0,
  "ALTER TABLE challans MODIFY COLUMN status ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled') DEFAULT 'pending'",
  'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
