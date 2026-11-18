-- =========================================
-- 003: workflow (assignments, feedback, SLA policies)
-- =========================================

CREATE TABLE assignments (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id      BIGINT UNSIGNED NOT NULL,
  worker_id         BIGINT UNSIGNED NOT NULL,
  department_id     BIGINT UNSIGNED NOT NULL,
  assigned_by       BIGINT UNSIGNED NOT NULL,
  status            ENUM('ACTIVE','REJECTED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'ACTIVE',
  accepted_at       TIMESTAMP NULL,
  started_at        TIMESTAMP NULL,
  rejected_at       TIMESTAMP NULL,
  rejection_reason  VARCHAR(500) NULL,
  completed_at      TIMESTAMP NULL,
  completion_notes  VARCHAR(1000) NULL,
  -- MySQL has no partial unique index: this column is non-NULL only while ACTIVE,
  -- so UNIQUE(active_complaint_id) allows at most one active assignment per complaint.
  active_complaint_id BIGINT UNSIGNED GENERATED ALWAYS AS (IF(status = 'ACTIVE', complaint_id, NULL)) STORED,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assignments_active (active_complaint_id),
  KEY idx_assignments_complaint (complaint_id),
  KEY idx_assignments_worker (worker_id, status),
  CONSTRAINT fk_assign_complaint FOREIGN KEY (complaint_id)  REFERENCES complaints(id)  ON DELETE CASCADE,
  CONSTRAINT fk_assign_worker    FOREIGN KEY (worker_id)     REFERENCES workers(id)     ON DELETE RESTRICT,
  CONSTRAINT fk_assign_dept      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_assign_by        FOREIGN KEY (assigned_by)   REFERENCES users(id)       ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE feedback (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id  BIGINT UNSIGNED NOT NULL,
  citizen_id    BIGINT UNSIGNED NOT NULL,
  rating        TINYINT UNSIGNED NOT NULL,
  comment       VARCHAR(1000) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_feedback_complaint (complaint_id),
  CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_feedback_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_citizen   FOREIGN KEY (citizen_id)   REFERENCES users(id)      ON DELETE CASCADE
) ENGINE=InnoDB;

-- Optional per (category, priority) override. If no row matches, domain/sla.js defaults apply.
CREATE TABLE sla_policies (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  org_id           BIGINT UNSIGNED NOT NULL,
  category         VARCHAR(60) NOT NULL,
  priority         ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  hours_to_resolve INT UNSIGNED NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sla (org_id, category, priority),
  CONSTRAINT fk_sla_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;
