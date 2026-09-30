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
  service_type         VARCHAR(30) NOT NULL,   -- a service_categories.slug, validated by the API
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

-- ---------- Module 3: service categories (admin-managed) ----------

CREATE TABLE IF NOT EXISTS service_categories (
  id           SERIAL PRIMARY KEY,
  slug         VARCHAR(30)  NOT NULL UNIQUE,
  name         VARCHAR(60)  NOT NULL,
  description  TEXT,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO service_categories (slug, name, description) VALUES
  ('maid',       'Maid',       'Household cleaning, cooking and daily chores'),
  ('babysitter', 'Babysitter', 'Short-term child care and supervision'),
  ('nanny',      'Nanny',      'Full-time or long-term child care')
ON CONFLICT (slug) DO NOTHING;

-- Upgrade older databases created in Module 2 (harmless on new ones)
ALTER TABLE helper_profiles DROP CONSTRAINT IF EXISTS helper_profiles_service_type_check;
ALTER TABLE helper_profiles ALTER COLUMN service_type TYPE VARCHAR(30);


-- ---------- Module 4: household profiles + rating fields for browsing ----------

CREATE TABLE IF NOT EXISTS household_profiles (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  address         VARCHAR(255),
  pincode         VARCHAR(10),
  family_size     INTEGER CHECK (family_size BETWEEN 1 AND 30),
  children_count  INTEGER NOT NULL DEFAULT 0 CHECK (children_count BETWEEN 0 AND 20),
  has_pets        BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Filled in by the reviews module; needed now so profiles can show ratings
ALTER TABLE helper_profiles ADD COLUMN IF NOT EXISTS avg_rating   NUMERIC(3,2) NOT NULL DEFAULT 0;
ALTER TABLE helper_profiles ADD COLUMN IF NOT EXISTS review_count INTEGER      NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_helper_profiles_browse
  ON helper_profiles (verification_status, service_type);

-- ---------- Module 5: bookings & attendance ----------

CREATE TABLE IF NOT EXISTS bookings (
  id               SERIAL PRIMARY KEY,
  household_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  helper_id        INTEGER NOT NULL REFERENCES helper_profiles(id) ON DELETE CASCADE,
  plan_type        VARCHAR(10) NOT NULL CHECK (plan_type IN ('hourly', 'monthly', 'yearly')),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  start_time       TIME NOT NULL,   -- daily working window
  end_time         TIME NOT NULL,
  schedule_days    TEXT[] NOT NULL DEFAULT '{}',
  quantity         NUMERIC(6,2) NOT NULL,      -- hours (hourly) / months (monthly) / years (yearly)
  rate             NUMERIC(10,2) NOT NULL,     -- helper's rate at booking time (price snapshot)
  total_price      NUMERIC(12,2) NOT NULL,
  address          VARCHAR(255) NOT NULL,
  notes            TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')),
  rejection_reason TEXT,
  cancel_reason    TEXT,
  cancelled_by     VARCHAR(20),
  responded_at     TIMESTAMP,
  completed_at     TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_helper    ON bookings (helper_id, status, start_date);
CREATE INDEX IF NOT EXISTS idx_bookings_household ON bookings (household_id, created_at);

CREATE TABLE IF NOT EXISTS booking_attendance (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  work_date   DATE NOT NULL,
  status      VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent')),
  note        VARCHAR(255),
  marked_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, work_date)
);

-- ---------- Module 6: reviews, complaints, notifications, login tracking ----------

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS reviews (
  id            SERIAL PRIMARY KEY,
  booking_id    INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  household_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  helper_id     INTEGER NOT NULL REFERENCES helper_profiles(id) ON DELETE CASCADE,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       VARCHAR(1000),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_helper ON reviews (helper_id, created_at);

CREATE TABLE IF NOT EXISTS complaints (
  id               SERIAL PRIMARY KEY,
  booking_id       INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  complainant_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  against_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category         VARCHAR(20) NOT NULL
                   CHECK (category IN ('no_show', 'misconduct', 'payment', 'quality', 'other')),
  description      TEXT NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),
  resolution_note  TEXT,
  resolved_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints (status, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(40) NOT NULL,
  title       VARCHAR(120) NOT NULL,
  message     VARCHAR(500),
  link        VARCHAR(255),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read, created_at);
