-- Exam paper generator + answer key / marking scheme enhancements

ALTER TABLE exam_papers
  ADD COLUMN exam_type VARCHAR(100) NULL AFTER title,
  ADD COLUMN paper_date DATE NULL AFTER duration_minutes,
  ADD COLUMN difficulty_distribution JSON NULL AFTER instructions,
  ADD COLUMN question_type_distribution JSON NULL AFTER difficulty_distribution,
  ADD COLUMN paper_structure JSON NULL AFTER question_type_distribution,
  ADD COLUMN allow_pending_questions TINYINT(1) NOT NULL DEFAULT 0 AFTER paper_structure,
  ADD COLUMN allow_student_view TINYINT(1) NOT NULL DEFAULT 0 AFTER published,
  ADD COLUMN answer_key_json LONGTEXT NULL AFTER answer_key_pdf_url,
  ADD COLUMN marking_scheme_json LONGTEXT NULL AFTER answer_key_json,
  ADD COLUMN marking_scheme_pdf_url VARCHAR(500) NULL AFTER marking_scheme_json,
  ADD COLUMN answer_key_ai_generated TINYINT(1) NOT NULL DEFAULT 0 AFTER marking_scheme_pdf_url,
  ADD COLUMN marking_scheme_ai_generated TINYINT(1) NOT NULL DEFAULT 0 AFTER answer_key_ai_generated;

CREATE TABLE IF NOT EXISTS exam_paper_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  exam_type VARCHAR(100) NULL,
  difficulty_distribution JSON NULL,
  question_type_distribution JSON NULL,
  instructions TEXT NULL,
  default_duration_minutes INT NOT NULL DEFAULT 120,
  default_total_marks DECIMAL(8,2) NOT NULL DEFAULT 100.00,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS exam_paper_answer_key_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_paper_id INT NOT NULL,
  institution_id INT NOT NULL,
  version_no INT NOT NULL DEFAULT 1,
  answer_key_json LONGTEXT NULL,
  marking_scheme_json LONGTEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_paper_id) REFERENCES exam_papers(id) ON DELETE CASCADE,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_exam_paper_templates_institution ON exam_paper_templates(institution_id);
CREATE INDEX idx_exam_paper_ak_versions_paper ON exam_paper_answer_key_versions(exam_paper_id);
