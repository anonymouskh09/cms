-- Add school_administrator role and migrate existing principal users (full portal access)
ALTER TABLE users MODIFY role ENUM(
  'owner',
  'school_administrator',
  'principal',
  'admin',
  'teacher',
  'student',
  'parent',
  'finance_manager'
) NOT NULL;

UPDATE users SET role = 'school_administrator' WHERE role = 'principal';
