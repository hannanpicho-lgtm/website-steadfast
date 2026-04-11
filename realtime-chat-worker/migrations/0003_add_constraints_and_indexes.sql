-- Migration 0003: Add missing indexes, CHECK constraints, and foreign key improvements
-- Note: SQLite does not support ALTER TABLE ADD CONSTRAINT for CHECK or FK.
-- These constraints are documented here and applied to the schema.sql for new deployments.
-- Existing data must be validated manually before re-creating tables.

-- Additional indexes for query performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_assigned_agent ON chat_conversations(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read_at ON chat_messages(read_at);

CREATE INDEX IF NOT EXISTS idx_chat_events_conversation_id ON chat_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_actor_id ON chat_events(actor_id);

CREATE INDEX IF NOT EXISTS idx_chat_ws_tickets_conversation_id ON chat_ws_tickets(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_ws_tickets_actor_id ON chat_ws_tickets(actor_id);

CREATE INDEX IF NOT EXISTS idx_chat_sla_alerts_acknowledged_at ON chat_sla_alerts(acknowledged_at);

CREATE INDEX IF NOT EXISTS idx_chat_delivery_failures_message_id ON chat_delivery_failures(message_id);
