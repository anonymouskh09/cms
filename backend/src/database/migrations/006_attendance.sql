CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  student_id INT NOT NULL,
  class_id INT,
  section_id INT,
  marked_by INT NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('present', 'absent', 'late', 'leave') NOT NULL DEFAULT 'present',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
  FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_date (student_id, attendance_date)
);

CREATE INDEX idx_attendance_institution ON attendance(institution_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
