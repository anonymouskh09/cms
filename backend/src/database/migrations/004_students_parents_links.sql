CREATE TABLE IF NOT EXISTS parents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  user_id INT,
  admission_no VARCHAR(50),
  roll_no VARCHAR(50),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  gender ENUM('male', 'female', 'other'),
  date_of_birth DATE,
  phone VARCHAR(20),
  address TEXT,
  class_id INT,
  section_id INT,
  parent_id INT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS parent_student_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_user_id INT NOT NULL,
  student_id INT NOT NULL,
  relationship VARCHAR(50) DEFAULT 'parent',
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE KEY unique_parent_student (parent_user_id, student_id)
);

CREATE INDEX idx_students_institution ON students(institution_id);
CREATE INDEX idx_parents_institution ON parents(institution_id);
