CREATE TABLE IF NOT EXISTS chat_conversations (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending', 'archived')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_agent TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  sla_due_at TEXT,
  last_message_at TEXT,
  last_response_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_username ON chat_conversations(username);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_priority ON chat_conversations(priority);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON chat_conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_assigned_agent ON chat_conversations(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'agent', 'system')),
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  attachment_json TEXT,
  created_at TEXT NOT NULL,
  delivered_at TEXT NOT NULL,
  latency_ms INTEGER CHECK (latency_ms >= 0),
  read_at TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  delivery_failed INTEGER NOT NULL DEFAULT 0 CHECK (delivery_failed IN (0, 1)),
  delayed_delivery INTEGER NOT NULL DEFAULT 0 CHECK (delayed_delivery IN (0, 1)),
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_order ON chat_messages(conversation_id, sequence);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_failed ON chat_messages(delivery_failed);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read_at ON chat_messages(read_at);

CREATE TABLE IF NOT EXISTS chat_events (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  event_type TEXT NOT NULL,
  actor_id TEXT,
  actor_role TEXT,
  payload_json TEXT,
  duration_ms INTEGER,
  success INTEGER NOT NULL CHECK (success IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_events_type ON chat_events(event_type);
CREATE INDEX IF NOT EXISTS idx_chat_events_created_at ON chat_events(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_events_conversation_id ON chat_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_actor_id ON chat_events(actor_id);

CREATE TABLE IF NOT EXISTS chat_delivery_failures (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  message_id TEXT,
  reason TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  dropped INTEGER NOT NULL DEFAULT 0 CHECK (dropped IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_delivery_failures_created_at ON chat_delivery_failures(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_delivery_failures_conversation_id ON chat_delivery_failures(conversation_id);

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
