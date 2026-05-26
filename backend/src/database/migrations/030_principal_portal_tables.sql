-- Principal portal: remarks, approvals, meetings, alerts

CREATE TABLE IF NOT EXISTS principal_remarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  principal_id INT NOT NULL,
  entity_type ENUM('student', 'teacher', 'class', 'result', 'exam', 'attendance') NOT NULL,
  entity_id INT NOT NULL,
  remarks TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (principal_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_principal_remarks_entity (institution_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS principal_approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  principal_id INT NOT NULL,
  approval_type ENUM('result', 'exam', 'timetable', 'discount') NOT NULL,
  entity_id INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (principal_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_principal_approvals_lookup (institution_id, approval_type, entity_id, status)
);

CREATE TABLE IF NOT EXISTS parent_meeting_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  parent_id INT NOT NULL,
  student_id INT NOT NULL,
  principal_id INT,
  requested_by ENUM('parent', 'principal', 'admin', 'school_administrator') NOT NULL,
  reason TEXT NOT NULL,
  meeting_date DATE,
  meeting_time TIME,
  status ENUM('pending', 'approved', 'rejected', 'rescheduled', 'completed') DEFAULT 'pending',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (principal_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_meeting_requests_institution (institution_id, status)
);

CREATE TABLE IF NOT EXISTS principal_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  principal_id INT,
  alert_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  entity_type VARCHAR(50),
  entity_id INT,
  status ENUM('active', 'dismissed', 'resolved') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (principal_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_principal_alerts_institution (institution_id, status)
);

-- Flag students needing principal attention
ALTER TABLE students
  ADD COLUMN needs_attention TINYINT(1) NOT NULL DEFAULT 0 AFTER status;
