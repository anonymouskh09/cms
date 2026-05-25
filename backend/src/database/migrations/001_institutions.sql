CREATE TABLE IF NOT EXISTS institutions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('school', 'academy') NOT NULL,
  shift ENUM('morning', 'evening', 'both') DEFAULT 'morning',
  academic_year_start DATE,
  school_start_time TIME,
  school_end_time TIME,
  late_window_minutes INT DEFAULT 15,
  fee_due_day INT DEFAULT 10,
  fine_per_day DECIMAL(10,2) DEFAULT 50.00,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
