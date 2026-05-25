-- Phase 2: Assignments module
-- Safe migration: CREATE TABLE IF NOT EXISTS only

CREATE TABLE IF NOT EXISTS assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  class_id INT NOT NULL,
  section_id INT,
  subject_id INT NOT NULL,
  teacher_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATETIME NOT NULL,
  max_marks DECIMAL(10,2) DEFAULT 100.00,
  attachment_url VARCHAR(500),
  status ENUM('draft', 'published', 'closed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  assignment_id INT NOT NULL,
  student_id INT NOT NULL,
  submission_text TEXT,
  attachment_url VARCHAR(500),
  submitted_at TIMESTAMP NULL,
  marks_obtained DECIMAL(10,2),
  feedback TEXT,
  graded_by INT,
  graded_at TIMESTAMP NULL,
  status ENUM('pending', 'submitted', 'graded', 'late') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_assignment_student (assignment_id, student_id)
);

CREATE INDEX idx_assignments_institution ON assignments(institution_id);
CREATE INDEX idx_assignments_class ON assignments(class_id, section_id);
CREATE INDEX idx_assignment_submissions_institution ON assignment_submissions(institution_id);
CREATE INDEX idx_assignment_submissions_student ON assignment_submissions(student_id);
