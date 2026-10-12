CREATE TABLE IF NOT EXISTS operations_drafts (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','archived')),
  due_date DATE,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  demo_key VARCHAR(100),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id,demo_key)
);
CREATE INDEX IF NOT EXISTS operations_drafts_owner_created ON operations_drafts(user_id,created_at DESC,id DESC);
