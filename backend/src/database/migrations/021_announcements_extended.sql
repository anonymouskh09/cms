-- Extend announcements for targeting, attachments, expiry, and pinning
SET @dbname = DATABASE();

SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'announcements' AND COLUMN_NAME = 'attachment_url');
SET @sql = IF(@exists = 0,
  'ALTER TABLE announcements
   ADD COLUMN attachment_url VARCHAR(500) NULL AFTER message,
   ADD COLUMN expires_at TIMESTAMP NULL AFTER attachment_url,
   ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT FALSE AFTER expires_at,
   ADD COLUMN priority ENUM(''normal'', ''important'', ''urgent'') NOT NULL DEFAULT ''normal'' AFTER is_pinned,
   ADD COLUMN target_role VARCHAR(50) NULL AFTER priority,
   ADD COLUMN target_class_id INT NULL AFTER target_role,
   ADD COLUMN target_section_id INT NULL AFTER target_class_id,
   ADD FOREIGN KEY (target_class_id) REFERENCES classes(id) ON DELETE SET NULL,
   ADD FOREIGN KEY (target_section_id) REFERENCES sections(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill target_class_id from legacy class_id
UPDATE announcements SET target_class_id = class_id WHERE target_class_id IS NULL AND class_id IS NOT NULL;
UPDATE announcements SET target_role = audience WHERE target_role IS NULL AND audience IS NOT NULL;

CREATE TABLE IF NOT EXISTS announcement_reads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_announcement_read (announcement_id, user_id),
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_announcement_reads_user ON announcement_reads(user_id);
CREATE INDEX idx_announcements_expires ON announcements(expires_at);
CREATE INDEX idx_announcements_pinned ON announcements(is_pinned);
