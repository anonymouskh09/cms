-- Per-student fee profiles (pending after admin adds student, active after finance setup)

CREATE TABLE IF NOT EXISTS student_fee_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  student_id INT NOT NULL,
  status ENUM('pending', 'active', 'inactive') NOT NULL DEFAULT 'pending',
  notes TEXT,
  configured_by INT NULL,
  configured_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_fee_profile (student_id),
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (configured_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS student_fee_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL,
  institution_id INT NOT NULL,
  student_id INT NOT NULL,
  fee_type VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  frequency ENUM('monthly', 'one_time') NOT NULL DEFAULT 'monthly',
  is_discount TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  one_time_charged TINYINT(1) NOT NULL DEFAULT 0,
  charged_challan_id INT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES student_fee_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (charged_challan_id) REFERENCES challans(id) ON DELETE SET NULL
);

CREATE INDEX idx_student_fee_profiles_status ON student_fee_profiles(institution_id, status);
CREATE INDEX idx_student_fee_items_student ON student_fee_items(student_id, status, frequency);
