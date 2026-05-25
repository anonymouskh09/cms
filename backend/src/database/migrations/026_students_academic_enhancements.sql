-- Student identity fields + class-subject mapping

ALTER TABLE students
  ADD COLUMN student_cnic VARCHAR(15) NULL AFTER last_name,
  ADD COLUMN father_name VARCHAR(255) NULL AFTER student_cnic,
  ADD COLUMN father_cnic VARCHAR(15) NULL AFTER father_name,
  ADD COLUMN student_code VARCHAR(30) NULL AFTER father_cnic;

CREATE TABLE IF NOT EXISTS class_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  class_id INT NOT NULL,
  subject_id INT NOT NULL,
  is_compulsory TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_class_subject (class_id, subject_id),
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE INDEX idx_class_subjects_class ON class_subjects(class_id);
CREATE INDEX idx_class_subjects_institution ON class_subjects(institution_id);
