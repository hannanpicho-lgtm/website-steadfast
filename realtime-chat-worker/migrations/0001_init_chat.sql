CREATE TABLE IF NOT EXISTS chat_conversations (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
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

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  sender_role TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  attachment_json TEXT,
  created_at TEXT NOT NULL,
  delivered_at TEXT NOT NULL,
  latency_ms INTEGER,
  read_at TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  delivery_failed INTEGER NOT NULL DEFAULT 0,
  delayed_delivery INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_order ON chat_messages(conversation_id, sequence);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_failed ON chat_messages(delivery_failed);

CREATE TABLE IF NOT EXISTS chat_events (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  event_type TEXT NOT NULL,
  actor_id TEXT,
  actor_role TEXT,
  payload_json TEXT,
  duration_ms INTEGER,
  success INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_events_type ON chat_events(event_type);
CREATE INDEX IF NOT EXISTS idx_chat_events_created_at ON chat_events(created_at);

CREATE TABLE IF NOT EXISTS chat_delivery_failures (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  message_id TEXT,
  reason TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  dropped INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_delivery_failures_created_at ON chat_delivery_failures(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_delivery_failures_conversation_id ON chat_delivery_failures(conversation_id);
