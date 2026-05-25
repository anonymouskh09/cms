-- Phase 2: Attendance correction requests
-- Safe migration: CREATE TABLE IF NOT EXISTS only

CREATE TABLE IF NOT EXISTS attendance_correction_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  attendance_id INT NOT NULL,
  student_id INT NOT NULL,
  requested_by INT NOT NULL,
  current_status ENUM('present', 'absent', 'late', 'leave') NOT NULL,
  requested_status ENUM('present', 'absent', 'late', 'leave') NOT NULL,
  reason TEXT NOT NULL,
  reviewed_by INT,
  reviewed_at TIMESTAMP NULL,
  review_remarks TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_attendance_correction_institution ON attendance_correction_requests(institution_id);
CREATE INDEX idx_attendance_correction_status ON attendance_correction_requests(status);
CREATE INDEX idx_attendance_correction_student ON attendance_correction_requests(student_id);
