-- =========================================
-- 002: complaints, images, status history, AI predictions
-- =========================================

CREATE TABLE complaints (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_no           VARCHAR(30) NOT NULL UNIQUE,
  org_id              BIGINT UNSIGNED NOT NULL,
  citizen_id          BIGINT UNSIGNED NOT NULL,
  title               VARCHAR(200) NOT NULL,
  description         TEXT NOT NULL,
  category_ai         VARCHAR(60) NULL,
  category_confirmed  VARCHAR(60) NOT NULL,
  ai_confidence       DECIMAL(5,4) NULL,
  priority            ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  status              ENUM(
                        'SUBMITTED','AI_ANALYSIS','UNDER_REVIEW','APPROVED',
                        'ASSIGNED','ACCEPTED','IN_PROGRESS',
                        'RESOLUTION_SUBMITTED','RESOLVED','REOPENED','REJECTED'
                      ) NOT NULL DEFAULT 'SUBMITTED',
  latitude            DECIMAL(9,6) NOT NULL,
  longitude           DECIMAL(9,6) NOT NULL,
  address             VARCHAR(255) NULL,
  ward_id             BIGINT UNSIGNED NULL,
  sla_due_at          TIMESTAMP NULL,
  resolved_at         TIMESTAMP NULL,
  rejection_reason    VARCHAR(500) NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_complaints_citizen (citizen_id),
  KEY idx_complaints_status (status),
  KEY idx_complaints_priority (priority),
  KEY idx_complaints_category (category_confirmed),
  KEY idx_complaints_ward (ward_id),
  KEY idx_complaints_geo (latitude, longitude),
  KEY idx_complaints_sla (sla_due_at),
  CONSTRAINT fk_complaints_org     FOREIGN KEY (org_id)     REFERENCES organizations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_complaints_citizen FOREIGN KEY (citizen_id) REFERENCES users(id)         ON DELETE CASCADE,
  CONSTRAINT fk_complaints_ward    FOREIGN KEY (ward_id)    REFERENCES wards(id)         ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE complaint_images (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id  BIGINT UNSIGNED NOT NULL,
  url           VARCHAR(500) NOT NULL,
  kind          ENUM('REPORT','BEFORE','AFTER') NOT NULL DEFAULT 'REPORT',
  uploaded_by   BIGINT UNSIGNED NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_images_complaint (complaint_id),
  CONSTRAINT fk_images_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_images_user      FOREIGN KEY (uploaded_by)  REFERENCES users(id)      ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE status_history (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id  BIGINT UNSIGNED NOT NULL,
  from_status   VARCHAR(30) NULL,
  to_status     VARCHAR(30) NOT NULL,
  changed_by    BIGINT UNSIGNED NOT NULL,
  remarks       VARCHAR(500) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_status_history_complaint (complaint_id),
  CONSTRAINT fk_status_history_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_status_history_user      FOREIGN KEY (changed_by)   REFERENCES users(id)      ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE ai_predictions (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id   BIGINT UNSIGNED NOT NULL,
  model_name     VARCHAR(80) NOT NULL,
  model_version  VARCHAR(40) NULL,
  task           ENUM('DETECT','CLASSIFY','DUPLICATE','SUMMARY') NOT NULL,
  result_json    JSON NOT NULL,
  confidence     DECIMAL(5,4) NULL,
  latency_ms     INT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ai_complaint (complaint_id),
  CONSTRAINT fk_ai_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
) ENGINE=InnoDB;