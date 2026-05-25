-- Phase 2: Challan generation audit log
-- Safe migration: CREATE TABLE IF NOT EXISTS only
-- Note: payments table already exists in 007_fee_structures_challans_payments.sql

CREATE TABLE IF NOT EXISTS challan_generation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institution_id INT NOT NULL,
  generation_type ENUM('individual', 'monthly_batch', 'class_batch') NOT NULL,
  month_year VARCHAR(7),
  class_id INT,
  generated_by INT NOT NULL,
  challans_count INT NOT NULL DEFAULT 0,
  filters_json JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_challan_generation_logs_institution ON challan_generation_logs(institution_id);
CREATE INDEX idx_challan_generation_logs_month ON challan_generation_logs(month_year);
