-- Quizzes: MCQ and Google Classroom-style forms

CREATE TABLE IF NOT EXISTS quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  class_id INT NOT NULL,
  section_id INT,
  subject_id INT NOT NULL,
  teacher_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  quiz_type ENUM('mcq', 'form') NOT NULL DEFAULT 'mcq',
  due_date DATETIME NOT NULL,
  time_limit_minutes INT,
  total_marks DECIMAL(10,2) DEFAULT 100.00,
  shuffle_questions TINYINT(1) DEFAULT 0,
  status ENUM('draft', 'published', 'closed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  question_text TEXT NOT NULL,
  question_type ENUM('multiple_choice', 'checkbox', 'short_answer', 'paragraph') NOT NULL,
  points DECIMAL(10,2) DEFAULT 1.00,
  required TINYINT(1) DEFAULT 1,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_question_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  option_text VARCHAR(500) NOT NULL,
  is_correct TINYINT(1) DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  quiz_id INT NOT NULL,
  student_id INT NOT NULL,
  submitted_at TIMESTAMP NULL,
  score DECIMAL(10,2),
  max_score DECIMAL(10,2),
  status ENUM('in_progress', 'submitted', 'graded') DEFAULT 'in_progress',
  graded_by INT,
  graded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_quiz_student (quiz_id, student_id)
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  question_id INT NOT NULL,
  answer_text TEXT,
  selected_option_ids JSON,
  is_correct TINYINT(1),
  points_awarded DECIMAL(10,2),
  teacher_feedback TEXT,
  FOREIGN KEY (submission_id) REFERENCES quiz_submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_submission_question (submission_id, question_id)
);

CREATE INDEX idx_quizzes_institution ON quizzes(institution_id);
CREATE INDEX idx_quizzes_class ON quizzes(class_id, section_id);
CREATE INDEX idx_quiz_submissions_quiz ON quiz_submissions(quiz_id);
