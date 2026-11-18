-- =========================================
-- 001: Reference seed
-- Idempotent: safe to execute repeatedly
-- =========================================

INSERT INTO organizations (id, name, slug, city, state)
VALUES (1, 'Demo Municipal Corporation', 'demo-mc', 'Demo City', 'Demo State')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  city = VALUES(city),
  state = VALUES(state);

INSERT INTO departments (org_id, name, code, contact_email) VALUES
  (1, 'Road Maintenance', 'ROAD', 'road@demo.local'),
  (1, 'Sanitation', 'SANITATION', 'sanitation@demo.local'),
  (1, 'Drainage', 'DRAINAGE', 'drainage@demo.local'),
  (1, 'Water Supply', 'WATER', 'water@demo.local'),
  (1, 'Electrical', 'ELECTRICAL', 'electrical@demo.local'),
  (1, 'Public Works', 'PUBLIC_WORKS', 'works@demo.local')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  contact_email = VALUES(contact_email);

INSERT INTO wards (org_id, name, code) VALUES
  (1, 'Ward 1', 'W01'),
  (1, 'Ward 2', 'W02')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);
