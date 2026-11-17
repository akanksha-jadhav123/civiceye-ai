-- =========================================
-- 001: core schema (orgs, users, departments, wards, workers)
-- =========================================

CREATE TABLE organizations (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  slug          VARCHAR(80)  NOT NULL UNIQUE,
  city          VARCHAR(100) NULL,
  state         VARCHAR(100) NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE users (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  org_id         BIGINT UNSIGNED NULL,
  email          VARCHAR(191) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           ENUM('CITIZEN','ADMIN','DEPT_MANAGER','WORKER') NOT NULL,
  full_name      VARCHAR(150) NOT NULL,
  phone          VARCHAR(20) NULL,
  preferred_lang VARCHAR(10) NOT NULL DEFAULT 'en',
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at  TIMESTAMP NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_org (org_id),
  CONSTRAINT fk_users_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE departments (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  org_id        BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(120) NOT NULL,
  code          VARCHAR(40)  NOT NULL,
  contact_email VARCHAR(191) NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dept_org_code (org_id, code),
  CONSTRAINT fk_dept_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE wards (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  org_id           BIGINT UNSIGNED NOT NULL,
  name             VARCHAR(120) NOT NULL,
  code             VARCHAR(40)  NOT NULL,
  boundary_geojson JSON NULL,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ward_org_code (org_id, code),
  CONSTRAINT fk_ward_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE workers (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  department_id BIGINT UNSIGNED NOT NULL,
  employee_code VARCHAR(60) NULL,
  skills        JSON NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_workers_user (user_id),
  KEY idx_workers_dept (department_id),
  CONSTRAINT fk_workers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_workers_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id    BIGINT UNSIGNED NULL,
  action      VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id   BIGINT UNSIGNED NULL,
  before_json JSON NULL,
  after_json  JSON NULL,
  ip          VARCHAR(45) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_actor (actor_id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;