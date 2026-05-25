-- Phase 2: Exam and results module
-- Safe migration: CREATE TABLE IF NOT EXISTS only

CREATE TABLE IF NOT EXISTS exam_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  description TEXT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_institution_exam_type_code (institution_id, code)
);

CREATE TABLE IF NOT EXISTS exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  exam_type_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  academic_year VARCHAR(20),
  class_id INT,
  start_date DATE,
  end_date DATE,
  default_max_marks DECIMAL(10,2) DEFAULT 100.00,
  default_pass_marks DECIMAL(10,2) DEFAULT 33.00,
  status ENUM('draft', 'published', 'completed', 'cancelled') DEFAULT 'draft',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_type_id) REFERENCES exam_types(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  exam_id INT NOT NULL,
  class_id INT,
  section_id INT,
  subject_id INT NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  room VARCHAR(50),
  max_marks DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  pass_marks DECIMAL(10,2) DEFAULT 33.00,
  status ENUM('scheduled', 'conducted', 'cancelled') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  exam_id INT NOT NULL,
  exam_schedule_id INT,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  marks_obtained DECIMAL(10,2),
  max_marks DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  grade VARCHAR(10),
  remarks TEXT,
  is_absent BOOLEAN DEFAULT FALSE,
  entered_by INT,
  status ENUM('draft', 'published') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_schedule_id) REFERENCES exam_schedules(id) ON DELETE SET NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_exam_student_subject (exam_id, student_id, subject_id)
);

CREATE TABLE IF NOT EXISTS report_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  student_id INT NOT NULL,
  exam_id INT NOT NULL,
  class_id INT,
  section_id INT,
  total_marks DECIMAL(10,2) DEFAULT 0,
  obtained_marks DECIMAL(10,2) DEFAULT 0,
  percentage DECIMAL(5,2),
  grade VARCHAR(10),
  rank_in_class INT,
  remarks TEXT,
  pdf_url VARCHAR(500),
  status ENUM('draft', 'published') DEFAULT 'draft',
  generated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_student_exam_report (student_id, exam_id)
);

CREATE INDEX idx_exam_types_institution ON exam_types(institution_id);
CREATE INDEX idx_exams_institution ON exams(institution_id);
CREATE INDEX idx_exam_schedules_institution ON exam_schedules(institution_id);
CREATE INDEX idx_exam_schedules_exam ON exam_schedules(exam_id);
CREATE INDEX idx_exam_results_institution ON exam_results(institution_id);
CREATE INDEX idx_exam_results_student ON exam_results(student_id);
CREATE INDEX idx_report_cards_institution ON report_cards(institution_id);
CREATE INDEX idx_report_cards_student ON report_cards(student_id);
