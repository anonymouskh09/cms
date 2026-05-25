CREATE TABLE IF NOT EXISTS fee_structures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  fee_type VARCHAR(100) NOT NULL,
  applicable_to ENUM('grade', 'class', 'subject', 'student') NOT NULL,
  applicable_id INT,
  amount DECIMAL(10,2) NOT NULL,
  frequency ENUM('monthly', 'one_time', 'per_subject') DEFAULT 'monthly',
  effective_from DATE,
  effective_to DATE,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS challans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  student_id INT NOT NULL,
  challan_no VARCHAR(50),
  month_year VARCHAR(7) NOT NULL,
  due_date DATE NOT NULL,
  fee_breakdown JSON,
  base_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  fine_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  payment_method VARCHAR(50),
  pdf_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  challan_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  received_by INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (challan_id) REFERENCES challans(id) ON DELETE CASCADE,
  FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_challans_institution ON challans(institution_id);
CREATE INDEX idx_challans_status ON challans(status);
