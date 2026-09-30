-- Helper4U database schema (PostgreSQL). Safe to run multiple times.

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(80)  NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  phone       VARCHAR(20),
  password    TEXT         NOT NULL,
  role        VARCHAR(20)  NOT NULL DEFAULT 'household'
              CHECK (role IN ('household', 'helper', 'admin')),
  city        VARCHAR(80),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ---------- Module 2: helper profiles & verification documents ----------

CREATE TABLE IF NOT EXISTS helper_profiles (
  id                   SERIAL PRIMARY KEY,
  user_id              INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  service_type         VARCHAR(20) NOT NULL
                       CHECK (service_type IN ('maid', 'babysitter', 'nanny')),
  bio                  TEXT,
  experience_years     INTEGER NOT NULL DEFAULT 0 CHECK (experience_years BETWEEN 0 AND 60),
  skills               TEXT[]  NOT NULL DEFAULT '{}',
  languages            TEXT[]  NOT NULL DEFAULT '{}',
  available_days       TEXT[]  NOT NULL DEFAULT '{}',
  available_from       TIME,
  available_to         TIME,
  availability_status  VARCHAR(20) NOT NULL DEFAULT 'available'
                       CHECK (availability_status IN ('available', 'busy', 'unavailable')),
  preferred_plans      TEXT[]  NOT NULL DEFAULT '{}',
  hourly_rate          NUMERIC(10,2) CHECK (hourly_rate  >= 0),
  monthly_rate         NUMERIC(10,2) CHECK (monthly_rate >= 0),
  yearly_rate          NUMERIC(10,2) CHECK (yearly_rate  >= 0),
  verification_status  VARCHAR(20) NOT NULL DEFAULT 'unverified'
                       CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  verification_note    TEXT,
  verified_at          TIMESTAMP,
  created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS helper_documents (
  id             SERIAL PRIMARY KEY,
  helper_id      INTEGER NOT NULL REFERENCES helper_profiles(id) ON DELETE CASCADE,
  doc_type       VARCHAR(30) NOT NULL
                 CHECK (doc_type IN ('identity', 'address_proof', 'police_verification', 'background_check', 'other')),
  original_name  VARCHAR(255) NOT NULL,
  stored_name    VARCHAR(255) NOT NULL,
  mime_type      VARCHAR(100) NOT NULL,
  size_bytes     INTEGER NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  uploaded_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_helper_docs_helper ON helper_documents(helper_id);
