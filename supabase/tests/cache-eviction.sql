-- Tests for cache size-based eviction function: cache_evict_by_size()
BEGIN;

CREATE EXTENSION IF NOT EXISTS "basejump-supabase_test_helpers";

SELECT plan(4);

-- ============================================================
-- Setup
-- ============================================================
SET ROLE postgres;

-- 테스트용 설정: 임계값 3, 제거 2
UPDATE public.cache_config SET value = '3' WHERE key = 'max_size';
UPDATE public.cache_config SET value = '2' WHERE key = 'evict_count';

-- 5개 삽입 (임계값 3 초과)
INSERT INTO public.cache (key, data, etag, expires_at, created_at) VALUES
  ('old_1', '{"q":"1"}'::jsonb, NULL, now() + interval '1 hour', now() - interval '5 minutes'),
  ('old_2', '{"q":"2"}'::jsonb, NULL, now() + interval '1 hour', now() - interval '4 minutes'),
  ('mid_3', '{"q":"3"}'::jsonb, NULL, now() + interval '1 hour', now() - interval '3 minutes'),
  ('new_4', '{"q":"4"}'::jsonb, NULL, now() + interval '1 hour', now() - interval '2 minutes'),
  ('new_5', '{"q":"5"}'::jsonb, NULL, now() + interval '1 hour', now() - interval '1 minute');

-- ============================================================
-- 1. Setup 확인: 5개 존재
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM public.cache),
  5,
  'Setup: 5 cache entries inserted'
);

-- ============================================================
-- 2. 제거 함수 실행
-- ============================================================
SELECT lives_ok(
  $$ SELECT public.cache_evict_by_size() $$,
  'Eviction function executes without error'
);

-- ============================================================
-- 3. 가장 오래된 2개 제거 → 3개 남음
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM public.cache),
  3,
  'After eviction: 3 entries remain (2 oldest evicted)'
);

-- ============================================================
-- 4. 남은 항목이 최신 항목인지 확인
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM public.cache WHERE key IN ('mid_3', 'new_4', 'new_5')),
  3,
  'Newest entries survive eviction'
);

SELECT * FROM finish();
ROLLBACK;
