-- Remove auto-pending profiles for students who already had challans (keep class-based fees)
DELETE p FROM student_fee_profiles p
WHERE p.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM challans c
    WHERE c.student_id = p.student_id AND c.status != 'cancelled'
  );
