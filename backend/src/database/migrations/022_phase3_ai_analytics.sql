-- Phase 3: AI tools, syllabus, analytics (schema only — Phase 3 UI uses placeholder data)

CREATE TABLE IF NOT EXISTS ai_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  provider VARCHAR(50) DEFAULT 'placeholder',
  model_name VARCHAR(100) DEFAULT 'cms-ai-placeholder',
  max_tokens INT DEFAULT 2000,
  temperature DECIMAL(3,2) DEFAULT 0.70,
  enable_question_bank BOOLEAN DEFAULT FALSE,
  enable_exam_generator BOOLEAN DEFAULT FALSE,
  enable_marking_scheme BOOLEAN DEFAULT FALSE,
  api_key_hint VARCHAR(50),
  status ENUM('active', 'inactive') DEFAULT 'inactive',
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uk_ai_settings_institution (institution_id)
);

CREATE TABLE IF NOT EXISTS syllabus_uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  class_id INT,
  subject_id INT,
  title VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_name VARCHAR(255),
  academic_year VARCHAR(20),
  uploaded_by INT,
  status ENUM('active', 'archived') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ai_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  class_id INT,
  subject_id INT,
  question_type ENUM('mcq', 'short', 'long', 'true_false') DEFAULT 'mcq',
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  question_text TEXT NOT NULL,
  options JSON,
  correct_answer TEXT,
  marks DECIMAL(6,2) DEFAULT 1,
  syllabus_topic VARCHAR(255),
  status ENUM('draft', 'approved', 'archived') DEFAULT 'draft',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ai_exam_papers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  class_id INT,
  subject_id INT,
  exam_id INT,
  total_marks DECIMAL(8,2) DEFAULT 100,
  duration_minutes INT DEFAULT 120,
  question_ids JSON,
  paper_body TEXT,
  status ENUM('draft', 'generated', 'archived') DEFAULT 'draft',
  generated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL,
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ai_marking_schemes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  exam_paper_id INT,
  title VARCHAR(255) NOT NULL,
  answers JSON,
  marking_guide TEXT,
  status ENUM('draft', 'generated', 'archived') DEFAULT 'draft',
  generated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_paper_id) REFERENCES ai_exam_papers(id) ON DELETE SET NULL,
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_syllabus_institution ON syllabus_uploads(institution_id);
CREATE INDEX idx_ai_questions_institution ON ai_questions(institution_id);
CREATE INDEX idx_ai_exam_papers_institution ON ai_exam_papers(institution_id);
