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
