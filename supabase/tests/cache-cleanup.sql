-- Tests for cache cleanup query:
--   DELETE FROM public.cache WHERE expires_at < now()
BEGIN;

CREATE EXTENSION IF NOT EXISTS "basejump-supabase_test_helpers";

SELECT plan(5);

-- ============================================================
-- Setup: insert test cache entries
-- ============================================================
SET ROLE postgres;

-- Expired entries (should be deleted)
INSERT INTO public.cache (key, data, etag, expires_at, created_at)
VALUES
  ('expired_1', '{"q":"old query 1"}'::jsonb, 'etag1', now() - interval '1 hour', now() - interval '2 hours'),
  ('expired_2', '{"q":"old query 2"}'::jsonb, NULL,    now() - interval '1 minute', now() - interval '1 hour');

-- Valid entries (should survive)
INSERT INTO public.cache (key, data, etag, expires_at, created_at)
VALUES
  ('valid_1', '{"q":"fresh query"}'::jsonb, 'etag3', now() + interval '1 hour', now()),
  ('valid_2', '{"q":"also fresh"}'::jsonb,  NULL,    now() + interval '24 hours', now());

-- Borderline: expires_at exactly now() — should NOT be deleted (< now(), not <=)
INSERT INTO public.cache (key, data, etag, expires_at, created_at)
VALUES
  ('borderline', '{"q":"edge case"}'::jsonb, NULL, now(), now());

-- ============================================================
-- 1. Verify setup: 5 entries exist
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM public.cache WHERE key IN ('expired_1','expired_2','valid_1','valid_2','borderline')),
  5,
  'Setup: 5 test cache entries inserted'
);

-- ============================================================
-- 2. Run the cleanup query (same as pg_cron job)
-- ============================================================
SELECT lives_ok(
  $$ DELETE FROM public.cache WHERE expires_at < now() $$,
  'Cleanup query executes without error'
);

-- ============================================================
-- 3. Expired entries are deleted
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM public.cache WHERE key IN ('expired_1','expired_2')),
  0,
  'Expired entries are deleted'
);

-- ============================================================
-- 4. Valid entries survive
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM public.cache WHERE key IN ('valid_1','valid_2')),
  2,
  'Non-expired entries survive cleanup'
);

-- ============================================================
-- 5. Borderline entry (expires_at = now()) survives
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM public.cache WHERE key = 'borderline'),
  1,
  'Entry with expires_at = now() is NOT deleted (strict less-than)'
);

SELECT * FROM finish();
ROLLBACK;
