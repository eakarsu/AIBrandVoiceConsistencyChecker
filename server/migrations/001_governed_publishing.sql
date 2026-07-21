ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);
UPDATE users SET tenant_id = 'user:' || id::text WHERE tenant_id IS NULL;
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;

CREATE TABLE IF NOT EXISTS publishing_workflows (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  idempotency_key VARCHAR(200) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  draft_id VARCHAR(200) NOT NULL,
  channel VARCHAR(100) NOT NULL,
  status VARCHAR(80) NOT NULL CHECK (status IN ('changes_required','awaiting_human_approval','approved_for_publish')),
  review JSONB NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS publishing_events (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES publishing_workflows(id) ON DELETE CASCADE,
  tenant_id VARCHAR(100) NOT NULL,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  event_type VARCHAR(100) NOT NULL,
  from_status VARCHAR(80),
  to_status VARCHAR(80) NOT NULL,
  evidence_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_publishing_tenant_status ON publishing_workflows(tenant_id,status);
CREATE INDEX IF NOT EXISTS idx_publishing_events_workflow ON publishing_events(workflow_id,created_at);
