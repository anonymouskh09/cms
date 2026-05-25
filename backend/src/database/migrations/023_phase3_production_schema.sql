-- Phase 3 production schema (additive only — does not drop or modify existing data in Phase 1/2/022 tables)

-- ---------------------------------------------------------------------------
-- Extend ai_settings (created in 022) toward production columns
-- ---------------------------------------------------------------------------
ALTER TABLE ai_settings
  ADD COLUMN model VARCHAR(100) NULL AFTER provider,
  ADD COLUMN is_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER temperature,
  ADD COLUMN created_by INT NULL AFTER is_enabled;

UPDATE ai_settings SET model = model_name WHERE model IS NULL AND model_name IS NOT NULL;
UPDATE ai_settings SET is_enabled = 1 WHERE status = 'active' AND is_enabled = 0;

ALTER TABLE ai_settings
  ADD CONSTRAINT fk_ai_settings_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Extend syllabus_uploads (created in 022)
-- ---------------------------------------------------------------------------
ALTER TABLE syllabus_uploads
  ADD COLUMN section_id INT NULL AFTER class_id,
  ADD COLUMN description TEXT NULL AFTER title,
  ADD COLUMN file_url VARCHAR(500) NULL AFTER file_name,
  ADD COLUMN file_type VARCHAR(50) NULL AFTER file_url,
  ADD COLUMN file_size BIGINT NULL AFTER file_type,
  ADD COLUMN tags VARCHAR(500) NULL AFTER academic_year,
  ADD COLUMN extracted_text LONGTEXT NULL AFTER tags,
  ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

UPDATE syllabus_uploads SET file_url = file_path WHERE file_url IS NULL AND file_path IS NOT NULL;

ALTER TABLE syllabus_uploads
  ADD CONSTRAINT fk_syllabus_uploads_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- question_bank
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_bank (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  syllabus_id INT NULL,
  class_id INT NULL,
  section_id INT NULL,
  subject_id INT NULL,
  chapter VARCHAR(255) NULL,
  topic VARCHAR(255) NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('mcq', 'short', 'long', 'true_false') NOT NULL DEFAULT 'mcq',
  difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
  marks DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  correct_answer TEXT NULL,
  explanation TEXT NULL,
  board_pattern VARCHAR(100) NULL,
  source ENUM('manual', 'ai', 'import') NOT NULL DEFAULT 'manual',
  status ENUM('draft', 'approved', 'rejected', 'archived') NOT NULL DEFAULT 'draft',
  created_by INT NULL,
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (syllabus_id) REFERENCES syllabus_uploads(id) ON DELETE SET NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- question_options
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  label VARCHAR(10) NOT NULL,
  option_text TEXT NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- exam_papers (separate from legacy ai_exam_papers in 022)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_papers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  exam_id INT NULL,
  class_id INT NULL,
  section_id INT NULL,
  subject_id INT NULL,
  title VARCHAR(255) NOT NULL,
  total_marks DECIMAL(8,2) NOT NULL DEFAULT 100.00,
  duration_minutes INT NOT NULL DEFAULT 120,
  instructions TEXT NULL,
  status ENUM('draft', 'generated', 'published', 'archived') NOT NULL DEFAULT 'draft',
  published TINYINT(1) NOT NULL DEFAULT 0,
  pdf_url VARCHAR(500) NULL,
  answer_key_pdf_url VARCHAR(500) NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- exam_paper_questions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_paper_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  exam_paper_id INT NOT NULL,
  question_id INT NOT NULL,
  section_name VARCHAR(100) NULL,
  question_order INT NOT NULL DEFAULT 0,
  marks DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_paper_id) REFERENCES exam_papers(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- ai_generation_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  user_id INT NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NULL,
  feature VARCHAR(50) NOT NULL,
  prompt_summary VARCHAR(500) NULL,
  status ENUM('success', 'failed', 'skipped') NOT NULL DEFAULT 'skipped',
  error_message TEXT NULL,
  tokens_used INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- student_topic_performance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_topic_performance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  student_id INT NOT NULL,
  class_id INT NULL,
  section_id INT NULL,
  subject_id INT NULL,
  topic VARCHAR(255) NOT NULL,
  score_percentage DECIMAL(5,2) NULL,
  weakness_level ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  source VARCHAR(50) NOT NULL DEFAULT 'analytics',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- teacher_performance_metrics
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_performance_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  teacher_id INT NOT NULL,
  class_id INT NULL,
  section_id INT NULL,
  subject_id INT NULL,
  average_result DECIMAL(5,2) NULL,
  pass_percentage DECIMAL(5,2) NULL,
  assignment_completion_rate DECIMAL(5,2) NULL,
  pending_grading_count INT NOT NULL DEFAULT 0,
  period_start DATE NULL,
  period_end DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- system_backups (owner-level; no institution_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_backups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  backup_type ENUM('full', 'incremental', 'manual') NOT NULL DEFAULT 'manual',
  status ENUM('pending', 'running', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  file_path VARCHAR(500) NULL,
  size BIGINT NULL,
  started_by INT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  error_message TEXT NULL,
  FOREIGN KEY (started_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- system_health_logs (owner-level; no institution_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_health_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  status ENUM('healthy', 'degraded', 'down') NOT NULL DEFAULT 'healthy',
  db_status ENUM('connected', 'disconnected', 'unknown') NOT NULL DEFAULT 'unknown',
  storage_status ENUM('ok', 'warning', 'error', 'unknown') NOT NULL DEFAULT 'unknown',
  server_status ENUM('ok', 'warning', 'error', 'unknown') NOT NULL DEFAULT 'unknown',
  message VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_question_bank_institution ON question_bank(institution_id);
CREATE INDEX idx_question_bank_status ON question_bank(institution_id, status);
CREATE INDEX idx_question_options_question ON question_options(question_id);
CREATE INDEX idx_exam_papers_institution ON exam_papers(institution_id);
CREATE INDEX idx_exam_paper_questions_paper ON exam_paper_questions(exam_paper_id);
CREATE INDEX idx_ai_generation_logs_institution ON ai_generation_logs(institution_id);
CREATE INDEX idx_ai_generation_logs_created ON ai_generation_logs(institution_id, created_at);
CREATE INDEX idx_student_topic_perf_institution ON student_topic_performance(institution_id);
CREATE INDEX idx_student_topic_perf_student ON student_topic_performance(student_id);
CREATE INDEX idx_teacher_perf_institution ON teacher_performance_metrics(institution_id);
CREATE INDEX idx_teacher_perf_teacher ON teacher_performance_metrics(teacher_id);
CREATE INDEX idx_system_backups_status ON system_backups(status);
CREATE INDEX idx_system_health_logs_created ON system_health_logs(created_at);
