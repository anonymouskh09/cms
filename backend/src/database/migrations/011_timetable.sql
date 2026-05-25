-- Phase 2: Timetable module
-- Safe migration: CREATE TABLE IF NOT EXISTS only

CREATE TABLE IF NOT EXISTS timetable_periods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  period_no INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_break BOOLEAN DEFAULT FALSE,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_institution_period_no (institution_id, period_no)
);

CREATE TABLE IF NOT EXISTS timetable_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  class_id INT NOT NULL,
  section_id INT,
  subject_id INT NOT NULL,
  teacher_id INT,
  timetable_period_id INT NOT NULL,
  day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
  room VARCHAR(50),
  effective_from DATE,
  effective_to DATE,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  FOREIGN KEY (timetable_period_id) REFERENCES timetable_periods(id) ON DELETE CASCADE,
  UNIQUE KEY unique_timetable_slot (institution_id, class_id, section_id, day_of_week, timetable_period_id)
);

CREATE INDEX idx_timetable_periods_institution ON timetable_periods(institution_id);
CREATE INDEX idx_timetable_entries_institution ON timetable_entries(institution_id);
CREATE INDEX idx_timetable_entries_class ON timetable_entries(class_id, section_id);
