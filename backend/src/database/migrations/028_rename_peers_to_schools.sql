-- Rename Peers School branding to Schools (institution id 1 demo)
UPDATE institutions SET name = 'Schools' WHERE name = 'Peers School' OR name LIKE '%Peers School%';

UPDATE users SET name = REPLACE(name, 'Peers ', 'Schools ') WHERE name LIKE 'Peers %';

UPDATE sms_templates SET message_body = REPLACE(message_body, 'Peers School', 'Schools') WHERE message_body LIKE '%Peers School%';

UPDATE announcements SET title = REPLACE(title, 'Peers School', 'Schools') WHERE title LIKE '%Peers School%';
UPDATE announcements SET message = REPLACE(message, 'Peers School', 'Schools') WHERE message LIKE '%Peers School%';
