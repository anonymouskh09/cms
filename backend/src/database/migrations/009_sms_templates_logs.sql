CREATE TABLE IF NOT EXISTS sms_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT,
  template_name VARCHAR(100) NOT NULL,
  template_type ENUM('attendance_absent', 'fee_reminder', 'fee_overdue', 'general', 'exam_notice') NOT NULL,
  message_body TEXT NOT NULL,
  variables JSON,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sms_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT,
  recipient VARCHAR(50),
  message_type VARCHAR(50),
  message_preview TEXT,
  status ENUM('sent', 'failed', 'pending') DEFAULT 'pending',
  sent_at TIMESTAMP NULL,
  sent_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL,
  FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL
);
