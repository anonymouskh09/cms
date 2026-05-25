-- Phase 2: Parent/teacher messaging
-- Safe migration: CREATE TABLE IF NOT EXISTS only

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  sender_user_id INT NOT NULL,
  recipient_user_id INT NOT NULL,
  student_id INT,
  subject VARCHAR(255),
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  parent_message_id INT,
  status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE SET NULL
);

CREATE INDEX idx_messages_institution ON messages(institution_id);
CREATE INDEX idx_messages_sender ON messages(sender_user_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_user_id);
CREATE INDEX idx_messages_student ON messages(student_id);
