-- Demo citizen: citizen@civiceye.local / Citizen@123
INSERT INTO users (org_id, email, password_hash, role, full_name)
VALUES (1, 'citizen@civiceye.local',
  '$2b$10$rQZ9vXf2Yn1pQ8sXqKzB7Oe2V6m5V6ZqC1mF3sU7nY8hR9kL0pQwS',
  'CITIZEN', 'Demo Citizen')
ON DUPLICATE KEY UPDATE
  role = VALUES(role), full_name = VALUES(full_name);