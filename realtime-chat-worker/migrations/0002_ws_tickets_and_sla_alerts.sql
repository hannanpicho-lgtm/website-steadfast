CREATE TABLE IF NOT EXISTS chat_ws_tickets (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_ws_tickets_token_hash ON chat_ws_tickets(token_hash);
CREATE INDEX IF NOT EXISTS idx_chat_ws_tickets_expires_at ON chat_ws_tickets(expires_at);

CREATE TABLE IF NOT EXISTS chat_sla_alerts (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  breached_at TEXT NOT NULL,
  acknowledged_at TEXT,
  escalated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_sla_alerts_conversation ON chat_sla_alerts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_sla_alerts_breached_at ON chat_sla_alerts(breached_at);
