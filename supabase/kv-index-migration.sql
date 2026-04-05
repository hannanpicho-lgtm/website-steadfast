-- ============================================================
-- KV Store Performance Index
-- Run once in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gvqwvuqeenkusdayosty/sql/new
-- ============================================================
-- The kv_store_a1c55d7e table already has a PRIMARY KEY on `key`,
-- which Postgres auto-indexes as a B-tree. However, LIKE 'prefix%'
-- queries (used by getEntriesByPrefix) benefit from a text_pattern_ops
-- operator class index which speeds up left-anchored pattern matching
-- significantly at scale (1,000+ rows).

-- Check if the index already exists first:
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'kv_store_a1c55d7e';

-- If 'kv_store_a1c55d7e_key_pattern_idx' is NOT in the results above,
-- run the statement below to create it:

CREATE INDEX CONCURRENTLY IF NOT EXISTS kv_store_a1c55d7e_key_pattern_idx
  ON kv_store_a1c55d7e (key text_pattern_ops);

-- CONCURRENTLY means Postgres builds the index without locking the table.
-- This is safe to run on a live, production database with active traffic.
-- Expected completion time: seconds on current data size.
