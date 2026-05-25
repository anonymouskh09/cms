-- Syllabus extraction status + question bank enum extensions (additive)

ALTER TABLE syllabus_uploads
  ADD COLUMN extraction_status ENUM('pending', 'completed', 'failed', 'not_applicable') NOT NULL DEFAULT 'pending' AFTER extracted_text;

ALTER TABLE question_bank
  MODIFY COLUMN question_type ENUM('mcq', 'short', 'long', 'true_false', 'fill_blank') NOT NULL DEFAULT 'mcq';

ALTER TABLE question_bank
  MODIFY COLUMN status ENUM('draft', 'pending_review', 'approved', 'rejected', 'archived') NOT NULL DEFAULT 'draft';
