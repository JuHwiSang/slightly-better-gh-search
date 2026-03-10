-- Tests for profiles table, RLS and rate limit functions
BEGIN;

CREATE EXTENSION IF NOT EXISTS "basejump-supabase_test_helpers";

SELECT plan(10);

-- ============================================================
-- 1. Schema definition
-- ============================================================
SELECT has_table('public', 'profiles', 'profiles table exists');
SELECT has_function('public', 'update_search_rate_limit', ARRAY['integer', 'integer', 'timestamp with time zone'], 'update_search_rate_limit function exists');
SELECT has_function('public', 'update_repo_rate_limit', ARRAY['integer', 'integer', 'timestamp with time zone'], 'update_repo_rate_limit function exists');

-- ============================================================
-- 2. Trigger auto-creates profile
-- ============================================================
SELECT tests.create_supabase_user('profile_user1');

SELECT is(
  (SELECT count(*) FROM public.profiles WHERE id = tests.get_supabase_uid('profile_user1')),
  1::bigint,
  'Trigger should create a profile when an auth.user is created'
);

SELECT is(
  (SELECT search_limit_remaining FROM public.profiles WHERE id = tests.get_supabase_uid('profile_user1')),
  10,
  'Default search rate limit should be 10'
);

SELECT is(
  (SELECT repo_limit_remaining FROM public.profiles WHERE id = tests.get_supabase_uid('profile_user1')),
  5000,
  'Default repo rate limit should be 5000'
);

-- ============================================================
-- 3. RLS prevents selecting other profiles
-- ============================================================
SELECT tests.create_supabase_user('profile_user2');
SELECT tests.authenticate_as('profile_user1');

SELECT is(
  (SELECT count(*) FROM public.profiles),
  1::bigint,
  'RLS should allow users to view ONLY their own profile'
);

SELECT is(
  (SELECT id FROM public.profiles LIMIT 1),
  tests.get_supabase_uid('profile_user1'),
  'The profile returned should belong to the authenticated user'
);

-- ============================================================
-- 4. RPC updates own profile
-- ============================================================
SELECT lives_ok(
  $$ SELECT public.update_search_rate_limit(2, 5, now() + interval '1 hour') $$,
  'Authenticated user can update search rate limit via RPC'
);

-- No need to check the value itself via separate query as long as lives_ok passes and we know RPC filters by auth.uid(), but just to be sure:
-- RLS lets us view our own profile:
SELECT is(
  (SELECT search_limit_remaining FROM public.profiles LIMIT 1),
  5,
  'Search limit should be updated by the RPC'
);


SELECT tests.clear_authentication();

SELECT * FROM finish();
ROLLBACK;
